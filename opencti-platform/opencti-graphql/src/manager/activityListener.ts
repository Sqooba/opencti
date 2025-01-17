/*
Copyright (c) 2021-2023 Filigran SAS

This file is part of the OpenCTI Enterprise Edition ("EE") and is
licensed under the OpenCTI Non-Commercial License (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

https://github.com/OpenCTI-Platform/opencti/blob/master/LICENSE

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*/

import LRU from 'lru-cache';
import {
  ActionHandler,
  ActionListener,
  registerUserActionListener,
  UserAction,
  UserReadAction,
} from '../listener/UserActionListener';
import conf, { logAudit } from '../config/conf';
import { isEmptyField } from '../database/utils';
import type { BasicStoreSettings } from '../types/store';
import { EVENT_ACTIVITY_VERSION, storeActivityEvent } from '../database/redis';
import type { UserOrigin } from '../types/user';
import { getEntityFromCache } from '../database/cache';
import { ENTITY_TYPE_SETTINGS, isInternalObject } from '../schema/internalObject';
import { executionContext, INTERNAL_USERS, SYSTEM_USER } from '../utils/access';
import { ENTITY_TYPE_WORKSPACE } from '../modules/workspace/workspace-types';
import { isStixCoreRelationship } from '../schema/stixCoreRelationship';
import { isStixCoreObject } from '../schema/stixCoreObject';

const INTERNAL_READ_ENTITIES = [ENTITY_TYPE_WORKSPACE];
const LOGS_SENSITIVE_FIELDS = conf.get('app:app_logs:logs_redacted_inputs') ?? [];

export interface ActivityStreamEvent {
  version: string
  type: 'authentication' | 'read' | 'mutation' | 'file' | 'command'
  event_access: 'extended' | 'administration'
  event_scope: string
  message: string
  status: 'error' | 'success'
  origin: Partial<UserOrigin>
  data: object
}

const initActivityManager = () => {
  const activityReadCache = new LRU({ ttl: 60 * 60 * 1000, max: 5000 }); // Read lifetime is 1 hour
  const cleanInputData = (obj: any) => {
    const stack = [obj];
    while (stack.length > 0) {
      const currentObj = stack.pop() as any;
      Object.keys(currentObj).forEach((key) => {
        if (LOGS_SENSITIVE_FIELDS.includes(key)) {
          currentObj[key] = '*** Redacted ***';
        }
        if (typeof currentObj[key] === 'object' && currentObj[key] !== null) {
          stack.push(currentObj[key]);
        }
      });
    }
    return obj;
  };
  const buildActivityStreamEvent = (action: UserAction, message: string): ActivityStreamEvent => {
    const data = cleanInputData(action.context_data ?? {});
    return {
      version: EVENT_ACTIVITY_VERSION,
      type: action.event_type,
      event_access: action.event_access,
      event_scope: action.event_scope,
      status: action.status ?? 'success',
      origin: action.user.origin,
      message,
      data,
    };
  };
  const activityLogger = async (action: UserAction, message: string): Promise<boolean> => {
    const context = executionContext('activity_listener');
    const level = action.status === 'error' ? 'error' : 'info';
    const settings = await getEntityFromCache<BasicStoreSettings>(context, SYSTEM_USER, ENTITY_TYPE_SETTINGS);
    // If enterprise edition is not activated
    if (isEmptyField(settings.enterprise_edition)) {
      return false;
    }
    // If extended actions, is action is not for listened user
    const isUserListening = (settings.activity_listeners_users ?? []).includes(action.user.id);
    if (action.event_access === 'extended' && !isUserListening) {
      return false;
    }
    // If standard action, log and push to activity stream.
    const event = buildActivityStreamEvent(action, message);
    const meta = {
      version: event.version,
      type: event.type,
      event_scope: event.event_scope,
      event_access: event.event_access,
      data: event.data
    };
    // In admin case put that to logs/console
    if (action.event_access === 'administration') {
      logAudit._log(level, action.user, message, meta);
    }
    // In all case, store in history
    await storeActivityEvent(event);
    return true;
  };
  const readActivity = async (action: UserReadAction) => {
    const { id, entity_type, entity_name } = action.context_data;
    const identifier = `${id}-${action.user.id}`;
    // Auto read only for stix knowledge, for other internal elements, it must be
    if (!activityReadCache.has(identifier)) {
      const message = `reads \`${entity_name}\` (${entity_type})`;
      const published = await activityLogger(action, message);
      if (published) {
        activityReadCache.set(identifier, undefined);
      }
    }
  };
  const activityHandler: ActionListener = {
    id: 'ACTIVITY_MANAGER',
    next: async (action: UserAction) => {
      // Internal users must not be tracked
      if (INTERNAL_USERS[action.user.id]) {
        return;
      }
      // Subscription is not part of the listening
      if (action.user.origin.socket !== 'query') {
        return;
      }
      if (action.event_type === 'authentication') {
        if (action.event_scope === 'login') {
          const { provider, username } = action.context_data;
          const isFailLogin = action.status === 'error';
          const message = isFailLogin ? `detects \`login failure\` for \`${username}\``
            : `login from provider \`${provider}\``;
          await activityLogger(action, message);
        }
        if (action.event_scope === 'logout') {
          await activityLogger(action, 'logout');
        }
      }
      if (action.event_type === 'read') {
        if (action.event_scope === 'unauthorized') {
          const message = `tries an \`unauthorized ${action.event_type}\``;
          await activityLogger(action, message);
        }
        if (action.event_scope === 'read') {
          const { entity_type } = action.context_data;
          const isKnowledgeListening = isStixCoreObject(entity_type) || isStixCoreRelationship(entity_type);
          const isInternalListening = isInternalObject(entity_type) && INTERNAL_READ_ENTITIES.includes(entity_type);
          if (isKnowledgeListening || isInternalListening) {
            await readActivity(action);
          }
        }
      }
      if (action.event_type === 'file') {
        if (action.event_scope === 'read') {
          const { file_name, entity_name } = action.context_data;
          const message = `downloads from \`${entity_name}\` the file \`${file_name}\``;
          await activityLogger(action, message);
        }
        if (action.event_scope === 'create') {
          const { file_name, entity_name, entity_type, path } = action.context_data;
          let message = `adds \`${file_name}\` in \`files\` for \`${entity_name}\` (${entity_type})`;
          if (path.includes('import/pending')) {
            message = `creates Analyst Workbench \`${file_name}\` for \`${entity_name}\` (${entity_type})`;
          }
          await activityLogger(action, message);
        }
        if (action.event_scope === 'delete') { // General upload
          const { file_name, entity_name, entity_type, path } = action.context_data;
          let message = `removes \`${file_name}\` in \`files\` for \`${entity_name}\` (${entity_type})`;
          if (path.includes('import/pending')) {
            message = `removes Analyst Workbench \`${file_name}\` for \`${entity_name}\` (${entity_type})`;
          }
          await activityLogger(action, message);
        }
      }
      if (action.event_type === 'command') {
        if (action.event_scope === 'search') {
          const message = 'asks for `advanced search`';
          await activityLogger(action, message);
        }
        if (action.event_scope === 'export') {
          const { format, entity_name } = action.context_data;
          const message = `asks for \`${format}\` export in \`${entity_name}\``;
          await activityLogger(action, message);
        }
        if (action.event_scope === 'import') {
          const { file_name, file_mime, entity_name } = action.context_data;
          const message = `asks for \`${file_mime}\` import of \`${file_name}\` in \`${entity_name}\``;
          await activityLogger(action, message);
        }
        if (action.event_scope === 'enrich') {
          const { entity_name, connector_name } = action.context_data;
          const message = `asks for \`${connector_name}\` enrichment in \`${entity_name}\``;
          await activityLogger(action, message);
        }
      }
      if (action.event_type === 'mutation') {
        if (action.event_scope === 'unauthorized') {
          const message = `tries an \`unauthorized ${action.event_type}\``;
          await activityLogger(action, message);
        }
        if (action.event_scope === 'create') {
          await activityLogger(action, action.message);
        }
        if (action.event_scope === 'update') {
          await activityLogger(action, action.message);
        }
        if (action.event_scope === 'delete') {
          await activityLogger(action, action.message);
        }
      }
    }
  };
  let handler: ActionHandler;
  return {
    start: async () => {
      handler = registerUserActionListener(activityHandler);
    },
    status: () => {
      return {
        id: 'ACTIVITY_MANAGER',
        enable: true,
        running: true,
      };
    },
    shutdown: async () => {
      if (handler) {
        handler.unregister();
      }
      return true;
    },
  };
};
const activityListener = initActivityManager();
export default activityListener;
