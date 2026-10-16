import {
  clientGroupScopesQueryKey,
  createClientGroupScope,
  deleteClientGroupScope,
  fetchClientGroupScopes,
} from '../../api/clients/groupScopes'
import type { Group } from '../../api/types'
import { ScopeAssignmentsDrawer } from '../Users/GroupScopesDrawer'
import { m } from '../../paraglide/messages'

type GroupScopesDrawerProps = {
  group: Group | null
  open: boolean
  onClose: () => void
}

export const GroupScopesDrawer = ({ group, open, onClose }: GroupScopesDrawerProps) => (
  <ScopeAssignmentsDrawer
    subject={group}
    open={open}
    onClose={onClose}
    queryKey={clientGroupScopesQueryKey}
    fetchAssignments={fetchClientGroupScopes}
    createAssignment={createClientGroupScope}
    deleteAssignment={deleteClientGroupScope}
    listQueryKey={['clients.groups.list']}
    title={(name) => m.clientGroupScopesTitle({ group: name })}
    checkboxHelp={m.clientGroupScopesCheckboxHelp()}
    systemReadOnly={m.clientGroupScopesSystemReadOnly()}
    showOpenIdConnectResources
  />
)
