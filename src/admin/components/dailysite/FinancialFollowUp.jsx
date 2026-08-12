import { Link } from "react-router-dom";
import {
  canSubmitCostFromDailySite, canSubmitSiteCost, costSubmissionBlockedReason,
  SITE_COST_LIFECYCLES,
} from "../../utils/siteCostCapabilities";
import { costTotal } from "../../utils/costPaymentTruth";
import { costReference } from "../../utils