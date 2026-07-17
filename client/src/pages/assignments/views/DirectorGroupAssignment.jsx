"use client"

import GroupAssignment from "./GroupAssignment"

// Director-side read-only view of a grouped instruction's assignments: reuses
// GroupAssignment's carousel UI but forces read-only mode and returns to the
// director's instruction list instead of the FC/controller one.
const DirectorGroupAssignment = () => <GroupAssignment viewOnly backRoute="/CompanyInstructions" />

export default DirectorGroupAssignment
