import Grid from '@mui/material/Grid';
import makeStyles from '@mui/styles/makeStyles';
import React, { FunctionComponent } from 'react';
import { useFragment } from 'react-relay';
import Loader, { LoaderVariant } from '../../../../components/Loader';
import { convertMarkings } from '../../../../utils/edition';
import { KNOWLEDGE_KNUPDATE } from '../../../../utils/hooks/useGranted';
import useQueryLoading from '../../../../utils/hooks/useQueryLoading';
import Security from '../../../../utils/Security';
import StixCoreObjectExternalReferences from '../../analysis/external_references/StixCoreObjectExternalReferences';
import StixCoreObjectOrStixCoreRelationshipNotes from '../../analysis/notes/StixCoreObjectOrStixCoreRelationshipNotes';
import ContainerHeader from '../../common/containers/ContainerHeader';
import ContainerStixObjectsOrStixRelationships from '../../common/containers/ContainerStixObjectsOrStixRelationships';
import StixCoreObjectLatestHistory from '../../common/stix_core_objects/StixCoreObjectLatestHistory';
import StixDomainObjectOverview from '../../common/stix_domain_objects/StixDomainObjectOverview';
import { CaseUtils_case$key } from '../__generated__/CaseUtils_case.graphql';
import CaseTasksLines, { caseTasksLinesQuery } from '../tasks/CaseTasksLines';
import { caseFragment } from '../CaseUtils';
import CaseRfiDetails from './CaseRfiDetails';
import CaseRfiEdition from './CaseRfiEdition';
import CaseRfiPopover from './CaseRfiPopover';
import { useFormatter } from '../../../../components/i18n';
import { usePaginationLocalStorage } from '../../../../utils/hooks/useLocalStorage';
import {
  TasksFilter,
  CaseTasksLinesQuery,
  CaseTasksLinesQuery$variables,
} from '../tasks/__generated__/CaseTasksLinesQuery.graphql';

const useStyles = makeStyles(() => ({
  gridContainer: {
    marginBottom: 20,
  },
  container: {
    margin: 0,
  },
}));

interface CaseRfiProps {
  data: CaseUtils_case$key;
}

const CaseRfiComponent: FunctionComponent<CaseRfiProps> = ({ data }) => {
  const classes = useStyles();
  const { t } = useFormatter();
  const caseRfiData = useFragment(caseFragment, data);

  const tasksFilters = {
    filters: [
      {
        key: ['objectContains' as TasksFilter],
        values: [caseRfiData.id],
      },
    ],
  };
  const LOCAL_STORAGE_KEY_CASE_TASKS = `view-cases-${caseRfiData.id}-caseTask`;

  const { viewStorage, helpers, paginationOptions } = usePaginationLocalStorage<CaseTasksLinesQuery$variables>(
    LOCAL_STORAGE_KEY_CASE_TASKS,
    {
      searchTerm: '',
      sortBy: 'name',
      orderAsc: true,
    },
    tasksFilters.filters,
  );

  const { sortBy, orderAsc } = viewStorage;

  const queryRef = useQueryLoading<CaseTasksLinesQuery>(
    caseTasksLinesQuery,
    paginationOptions,
  );

  return (
    <div className={classes.container}>
      <ContainerHeader
        container={caseRfiData}
        PopoverComponent={<CaseRfiPopover id={caseRfiData.id} />}
        enableSuggestions={false}
      />
      <Grid
        container={true}
        spacing={3}
        classes={{ container: classes.gridContainer }}
      >
        <Grid item={true} xs={6} style={{ paddingTop: 10 }}>
          <CaseRfiDetails caseRfiData={caseRfiData} />
        </Grid>
        <Grid item={true} xs={6} style={{ paddingTop: 10 }}>
          <StixDomainObjectOverview
            stixDomainObject={caseRfiData}
            displayAssignees={true}
          />
        </Grid>
        <Grid item={true} xs={6} style={{ marginTop: 30 }}>
          {queryRef && (
            <React.Suspense
              fallback={<Loader variant={LoaderVariant.inElement} />}
            >
              <CaseTasksLines
                queryRef={queryRef}
                paginationOptions={paginationOptions}
                caseId={caseRfiData.id}
                sortBy={sortBy}
                orderAsc={orderAsc}
                handleSort={helpers.handleSort}
                defaultMarkings={convertMarkings(caseRfiData)}
              />
            </React.Suspense>
          )}
        </Grid>
        <Grid item={true} xs={6} style={{ marginTop: 30 }}>
          <ContainerStixObjectsOrStixRelationships
            isSupportParticipation={false}
            container={caseRfiData}
            types={['Incident', 'stix-sighting-relationship', 'Report']}
            title={t('Origin of the case')}
          />
        </Grid>
        <Grid item={true} xs={6} style={{ marginTop: 30 }}>
          <ContainerStixObjectsOrStixRelationships
            isSupportParticipation={false}
            container={caseRfiData}
            types={['Stix-Cyber-Observable']}
            title={t('Observables')}
          />
        </Grid>
        <Grid item={true} xs={6} style={{ marginTop: 30 }}>
          <ContainerStixObjectsOrStixRelationships
            isSupportParticipation={false}
            container={caseRfiData}
          />
        </Grid>
        <Grid item={true} xs={6} style={{ marginTop: 30 }}>
          <StixCoreObjectExternalReferences stixCoreObjectId={caseRfiData.id} />
        </Grid>
        <Grid item={true} xs={6} style={{ marginTop: 30 }}>
          <StixCoreObjectLatestHistory stixCoreObjectId={caseRfiData.id} />
        </Grid>
      </Grid>
      <StixCoreObjectOrStixCoreRelationshipNotes
        stixCoreObjectOrStixCoreRelationshipId={caseRfiData.id}
        defaultMarkings={(caseRfiData.objectMarking?.edges ?? []).map(
          (edge) => edge.node,
        )}
      />
      <Security needs={[KNOWLEDGE_KNUPDATE]}>
        <CaseRfiEdition caseId={caseRfiData.id} />
      </Security>
    </div>
  );
};

export default CaseRfiComponent;
