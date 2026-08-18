// Phase 1B-A2 role/authority capabilities — PURE functions.
import { ROLES } from "../constants/roles";
import { PROJECT_STAGES, PROJECT_STATUSES } from "../constants/projectStatus";

export const OWNER_ONLY_STAGES = ["Completed"];
export const MANAGER_STAGES = PROJECT_STAGES.filter((stage) => !OWNER_ONLY_STAGES.includes(stage));
export const MANAGER_STATUS_TOGGLE = ["Ongoing", "Paused"];
export const MATERIAL_FIELD_KEYS = ["project_name","client_site_name","location","county","project_type","status","stage","lead_person_id","start_date","actual_start_date"];
export const MATERIAL_FIELD_LABELS = {
  project_name:"Project name", client_site_name:"Site / property name", location:"Location", county:"County",
  project_type:"Project type", status:"Status (Ongoing / Paused)", stage:"Project phase",
  lead_person_id:"Accountable lead", start_date:"Planned start", actual_start_date:"Actual start",
};
export const MANAGER_LOW_RISK_KEYS = ["next_action","next_action_date","blocker","notes"];

export function isOwner(role){ return role===ROLES.OWNER; }
export function isManager(role){ return role===ROLES.MANAGER; }
export function canCreateProjects(role){ return isOwner(role)||isManager(role); }
export function canEditProjects(role){ return isOwner(role)||isManager(role); }
export function canCreateProjectDirectly(role){ return isOwner(role); }
export function canProposeProjectIntake(role){ return isManager(role); }
export function canProposeMaterialChange(role){ return isManager(role); }
export function canSeePendingActivation(role){ return isOwner(role); }
export function canActivate(role,project){ return isOwner(role)&&!project.archived&&project.status==="Pending"; }
export function canMarkCompleted(role,project){ return isOwner(role)&&!project.archived&&!["Completed","Cancelled"].includes(project.status); }
export function canCancel(role,project){ return isOwner(role)&&!project.archived&&!["Cancelled","Completed"].includes(project.status); }
// Design-only is incoherent once delivery has reached Implementation, and the
// lifecycle trigger rejects that pair — so the action is not offered there.
export function canClassifyDesignOnly(role,project){ return isOwner(role)&&!project.archived&&!["Design-only","Completed","Cancelled"].includes(project.status)&&project.stage!=="Implementation"; }
export function canArchive(role,project){ return isOwner(role)&&!project.archived; }
export function canRestore(role,project){ return isOwner(role)&&project.archived; }
export function hasOwnerMaterialActions(role,project){ return canActivate(role,project)||canMarkCompleted(role,project)||canCancel(role,project)||canClassifyDesignOnly(role,project)||canArchive(role,project)||canRestore(role,project); }

export function statusOptionsForForm(role,mode,currentStatus){ if(isOwner(role)) return PROJECT_STATUSES; if(mode==="create") return ["Pending"]; return [currentStatus]; }
export function isStatusEditable(role){ return isOwner(role); }
export function stageOptionsForForm(role,mode,currentStage){
  if(isOwner(role)) {
    if(mode==="edit" && currentStage && !PROJECT_STAGES.includes(currentStage)) return [currentStage,...PROJECT_STAGES];
    return PROJECT_STAGES;
  }
  return [currentStage];
}
export function isStageEditable(role){ return isOwner(role); }
export function isTargetCompletionEditable(role,mode){ if(isOwner(role)) return true; return isManager(role)&&mode==="create"; }
export function isActualCompletionEditable(role){ return isOwner(role); }
export function isPortfolioEditable(role){ return isOwner(role); }
export function leadOptionsForRole(role,profiles=[],currentUserId=""){
  const active=profiles.filter((profile)=>profile.is_active);
  if(isOwner(role)) return active.filter((profile)=>["owner","manager","staff"].includes(profile.role));
  if(isManager(role)) return active.filter((profile)=>profile.role==="staff"||profile.id===currentUserId);
  return [];
}
export function projectFormCapabilities(role,mode,project){
  const currentStatus=project?.status; const currentStage=project?.stage;
  return {
    owner:isOwner(role), manager:isManager(role), materialEditable:isOwner(role), proposesMaterial:isManager(role),
    statusOptions:statusOptionsForForm(role,mode,currentStatus), statusEditable:isStatusEditable(role),
    stageOptions:stageOptionsForForm(role,mode,currentStage), stageEditable:isStageEditable(role),
    targetCompletionEditable:isTargetCompletionEditable(role,mode), actualCompletionEditable:isActualCompletionEditable(role),
    actualCompletionVisible:isOwner(role), portfolioEditable:isPortfolioEditable(role),
  };
}
