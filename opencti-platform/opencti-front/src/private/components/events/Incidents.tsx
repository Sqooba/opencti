import React, { FunctionComponent, useContext } from 'react';
import ListCards from '../../../components/list_cards/ListCards';
import ListLines from '../../../components/list_lines/ListLines';
import IncidentsCards, { incidentsCardsAndLinesPaginationQuery } from './incidents/IncidentsCards';
import IncidentsLines from './incidents/IncidentsLines';
import IncidentCreation from './incidents/IncidentCreation';
import Security from '../../../utils/Security';
import { KNOWLEDGE_KNUPDATE } from '../../../utils/hooks/useGranted';
import { UserContext } from '../../../utils/hooks/useAuth';
import useQueryLoading from '../../../utils/hooks/useQueryLoading';
import { usePaginationLocalStorage } from '../../../utils/hooks/useLocalStorage';
import { Filters } from '../../../components/list_lines';
import { IncidentLineDummy } from './incidents/IncidentLine';
import { IncidentCardDummy } from './incidents/IncidentCard';
import {
  IncidentsCardsAndLinesPaginationQuery,
  IncidentsCardsAndLinesPaginationQuery$variables,
} from './incidents/__generated__/IncidentsCardsAndLinesPaginationQuery.graphql';

export const LOCAL_STORAGE_KEY = 'view-incidents';
const Incidents: FunctionComponent = () => {
  const { helper } = useContext(UserContext);
  const { viewStorage, helpers, paginationOptions } = usePaginationLocalStorage<IncidentsCardsAndLinesPaginationQuery$variables>(
    LOCAL_STORAGE_KEY,
    {
      searchTerm: '',
      sortBy: 'name',
      orderAsc: true,
      openExports: false,
      filters: {} as Filters,
      view: 'lines',
    },
  );
  const dataColumns = {
    name: {
      label: 'Name',
      width: '25%',
      isSortable: true,
    },
    created: {
      label: 'Creation date',
      width: '10%',
      isSortable: true,
    },
    modified: {
      label: 'Modification date',
      width: '10%',
      isSortable: true,
    },
  };

  const {
    sortBy,
    orderAsc,
    searchTerm,
    filters,
    openExports,
    numberOfElements,
    view,
  } = viewStorage;

  const queryRef = useQueryLoading<IncidentsCardsAndLinesPaginationQuery>(
    incidentsCardsAndLinesPaginationQuery,
    paginationOptions,
  );
  // eslint-disable-next-line class-methods-use-this
  const isRuntimeSort = helper?.isRuntimeFieldEnable();

  const buildColumns = {
    name: {
      label: 'Name',
      width: '25%',
      isSortable: true,
    },
    incident_type: {
      label: 'Incident type',
      width: '10%',
      isSortable: true,
    },
    severity: {
      label: 'Severity',
      width: '10%',
      isSortable: true,
    },
    objectLabel: {
      label: 'Labels',
      width: '17%',
      isSortable: false,
    },
    created: {
      label: 'Creation date',
      width: '10%',
      isSortable: true,
    },
    modified: {
      label: 'Modification date',
      width: '10%',
      isSortable: true,
    },
    x_opencti_workflow_id: {
      label: 'Status',
      width: '10%',
      isSortable: true,
    },
    objectMarking: {
      label: 'Marking',
      isSortable: isRuntimeSort ?? false,
    },
  };
  const renderCards = () => {
    return (
      <ListCards
        sortBy={sortBy}
        orderAsc={orderAsc}
        dataColumns={dataColumns}
        handleSort={helpers.handleSort}
        handleSearch={helpers.handleSearch}
        handleChangeView={helpers.handleChangeView}
        handleAddFilter={helpers.handleAddFilter}
        handleRemoveFilter={helpers.handleRemoveFilter}
        handleToggleExports={helpers.handleToggleExports}
        openExports={openExports}
        exportEntityType="Incident"
        keyword={searchTerm}
        filters={filters}
        paginationOptions={paginationOptions}
        numberOfElements={numberOfElements}
        availableFilterKeys={[
          'incident_type',
          'labelledBy',
          'markedBy',
          'created_start_date',
          'created_end_date',
          'createdBy',
          'confidence',
        ]}
      >
        {queryRef && (
          <React.Suspense
            fallback={
              <>
               {Array(20)
                 .fill(0)
                 .map((idx) => (
                    <IncidentCardDummy key={idx} />
                 ))}
              </>
            }
          >
            <IncidentsCards
              queryRef={queryRef}
              onLabelClick={helpers.handleAddFilter}
              setNumberOfElements={helpers.handleSetNumberOfElements}
            />
          </React.Suspense>
        )}
      </ListCards>

    );
  };

  const renderLines = () => {
    return (
          <ListLines
            sortBy={sortBy}
            orderAsc={orderAsc}
            dataColumns={buildColumns}
            handleSort={helpers.handleSort}
            handleSearch={helpers.handleSearch}
            handleChangeView={helpers.handleChangeView}
            handleAddFilter={helpers.handleAddFilter}
            handleRemoveFilter={helpers.handleRemoveFilter}
            handleToggleExports={helpers.handleToggleExports}
            openExports={openExports}
            exportEntityType="Incident"
            keyword={searchTerm}
            filters={filters}
            paginationOptions={paginationOptions}
            numberOfElements={numberOfElements}
            availableFilterKeys={[
              'incident_type',
              'labelledBy',
              'markedBy',
              'x_opencti_workflow_id',
              'created_start_date',
              'created_end_date',
              'createdBy',
              'confidence',
            ]}
          >
            {queryRef && (
              <React.Suspense fallback={
                <>{Array(20).fill(0).map((idx) => (<IncidentLineDummy key={idx} dataColumns={buildColumns} />))}</>
              }>
                <IncidentsLines
                  queryRef={queryRef}
                  paginationOptions={paginationOptions}
                  dataColumns={buildColumns}
                  onLabelClick={helpers.handleAddFilter}
                  setNumberOfElements={helpers.handleSetNumberOfElements}
                />
              </React.Suspense>
            )}
          </ListLines>
    );
  };

  return (
      <div>
        {view === 'cards' ? renderCards() : ''}
        {view === 'lines' ? renderLines() : ''}
        <Security needs={[KNOWLEDGE_KNUPDATE]}>
          <IncidentCreation paginationOptions={paginationOptions} />
        </Security>
      </div>
  );
};

export default Incidents;