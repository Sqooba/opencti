import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import {
  ArrowForwardIosOutlined,
  DescriptionOutlined,
} from '@mui/icons-material';
import makeStyles from '@mui/styles/makeStyles';
import { useFormatter } from '../../../components/i18n';
import Security from '../../../utils/Security';
import {
  KNOWLEDGE_KNGETEXPORT,
  KNOWLEDGE_KNUPLOAD,
} from '../../../utils/hooks/useGranted';

const useStyles = makeStyles((theme) => ({
  buttonHome: {
    marginRight: theme.spacing(2),
    padding: '0 5px 0 5px',
    minHeight: 20,
    textTransform: 'none',
  },
  button: {
    marginRight: theme.spacing(2),
    padding: '0 5px 0 5px',
    minHeight: 20,
    minWidth: 20,
    textTransform: 'none',
  },
  icon: {
    marginRight: theme.spacing(1),
  },
  arrow: {
    verticalAlign: 'middle',
    marginRight: 10,
  },
}));

const TopMenuReport = () => {
  const location = useLocation();
  const { t } = useFormatter();
  const classes = useStyles();
  const { reportId } = useParams();
  return (
    <div>
      <Button
        component={Link}
        to="/dashboard/analysis/reports"
        variant="contained"
        size="small"
        color="primary"
        classes={{ root: classes.buttonHome }}
      >
        <DescriptionOutlined className={classes.icon} fontSize="small" />
        {t('Reports')}
      </Button>
      <ArrowForwardIosOutlined
        color="primary"
        classes={{ root: classes.arrow }}
      />
      <Button
        component={Link}
        to={`/dashboard/analysis/reports/${reportId}`}
        variant={
          location.pathname === `/dashboard/analysis/reports/${reportId}`
            ? 'contained'
            : 'text'
        }
        size="small"
        color={
          location.pathname === `/dashboard/analysis/reports/${reportId}`
            ? 'secondary'
            : 'primary'
        }
        classes={{ root: classes.button }}
      >
        {t('Overview')}
      </Button>
      <Button
        component={Link}
        to={`/dashboard/analysis/reports/${reportId}/knowledge`}
        variant={
          location.pathname.includes(
            `/dashboard/analysis/reports/${reportId}/knowledge`,
          )
            ? 'contained'
            : 'text'
        }
        size="small"
        color={
          location.pathname.includes(
            `/dashboard/analysis/reports/${reportId}/knowledge`,
          )
            ? 'secondary'
            : 'primary'
        }
        classes={{ root: classes.button }}
      >
        {t('Knowledge')}
      </Button>
      <Button
        component={Link}
        to={`/dashboard/analysis/reports/${reportId}/content`}
        variant={
          location.pathname
          === `/dashboard/analysis/reports/${reportId}/content`
            ? 'contained'
            : 'text'
        }
        size="small"
        color={
          location.pathname
          === `/dashboard/analysis/reports/${reportId}/content`
            ? 'secondary'
            : 'primary'
        }
        classes={{ root: classes.button }}
      >
        {t('Content')}
      </Button>
      <Button
        component={Link}
        to={`/dashboard/analysis/reports/${reportId}/entities`}
        variant={
          location.pathname
          === `/dashboard/analysis/reports/${reportId}/entities`
            ? 'contained'
            : 'text'
        }
        size="small"
        color={
          location.pathname
          === `/dashboard/analysis/reports/${reportId}/entities`
            ? 'secondary'
            : 'primary'
        }
        classes={{ root: classes.button }}
      >
        {t('Entities')}
      </Button>
      <Button
        component={Link}
        to={`/dashboard/analysis/reports/${reportId}/observables`}
        variant={
          location.pathname
          === `/dashboard/analysis/reports/${reportId}/observables`
            ? 'contained'
            : 'text'
        }
        size="small"
        color={
          location.pathname
          === `/dashboard/analysis/reports/${reportId}/observables`
            ? 'secondary'
            : 'primary'
        }
        classes={{ root: classes.button }}
      >
        {t('Observables')}
      </Button>
      <Security needs={[KNOWLEDGE_KNUPLOAD, KNOWLEDGE_KNGETEXPORT]}>
        <Button
          component={Link}
          to={`/dashboard/analysis/reports/${reportId}/files`}
          variant={
            location.pathname
            === `/dashboard/analysis/reports/${reportId}/files`
              ? 'contained'
              : 'text'
          }
          size="small"
          color={
            location.pathname
            === `/dashboard/analysis/reports/${reportId}/files`
              ? 'secondary'
              : 'primary'
          }
          classes={{ root: classes.button }}
        >
          {t('Data')}
        </Button>
      </Security>
    </div>
  );
};

export default TopMenuReport;
