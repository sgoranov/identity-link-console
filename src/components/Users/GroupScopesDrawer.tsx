import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Checkbox, Drawer, Empty, Select, Space, Spin, Tag, Typography } from 'antd'
import {
  audiencesQueryKey,
  authorizationScopesQueryKey,
  fetchAuthorizationAudiences,
  fetchAuthorizationScopes,
} from '../../api/authorization'
import type { AuthorizationOption } from '../../api/authorization'
import {
  createGroupScope,
  deleteGroupScope,
  fetchGroupScopes,
  groupScopesQueryKey,
} from '../../api/users/groupScopes'
import type { Group } from '../../api/types'
import { showErrorNotification } from '../../ui/notifications'
import { m } from '../../paraglide/messages'

type GroupScopesDrawerProps = {
  group: Group | null
  open: boolean
  onClose: () => void
}

type ScopeAssignment = { id: string; audience: string; scope: string }

type ScopeAssignmentsDrawerProps = {
  subject: { id: string; name: string; isSystem?: boolean } | null
  open: boolean
  onClose: () => void
  queryKey: (id: string) => readonly unknown[]
  fetchAssignments: (id: string) => Promise<ScopeAssignment[]>
  createAssignment: (id: string, payload: Pick<ScopeAssignment, 'audience' | 'scope'>) => Promise<unknown>
  deleteAssignment: (id: string, scopeId: string) => Promise<void>
  listQueryKey: readonly unknown[]
  title: (name: string) => string
  checkboxHelp: string
  systemReadOnly: string
  // Users hold the OpenID Connect default scopes implicitly, so only clients
  // need them assigned.
  showOpenIdConnectResources?: boolean
}

const toScopeOptions = (options: Record<string, AuthorizationOption>, kind: string) =>
  Object.entries(options).map(([value, definition]) => ({
    value,
    description: definition.description,
    kind,
  }))

export const ScopeAssignmentsDrawer = ({
  subject,
  open,
  onClose,
  queryKey,
  fetchAssignments,
  createAssignment,
  deleteAssignment,
  listQueryKey,
  title,
  checkboxHelp,
  systemReadOnly,
  showOpenIdConnectResources = false,
}: ScopeAssignmentsDrawerProps) => {
  const queryClient = useQueryClient()
  const [selectedAudience, setSelectedAudience] = useState<string>()
  const [savingScopes, setSavingScopes] = useState<Set<string>>(new Set())

  const scopesAssignmentsQuery = useQuery({
    queryKey: queryKey(subject?.id ?? ''),
    queryFn: () => fetchAssignments(subject!.id),
    enabled: open && Boolean(subject),
  })

  const audiencesQuery = useQuery({
    queryKey: audiencesQueryKey,
    queryFn: fetchAuthorizationAudiences,
    enabled: open,
  })

  useEffect(() => {
    if (!open) {
      setSelectedAudience(undefined)
      setSavingScopes(new Set())
      return
    }

    if (selectedAudience || !audiencesQuery.data?.length) return

    const assignedAudience = scopesAssignmentsQuery.data?.find((item) =>
      audiencesQuery.data.includes(item.audience),
    )?.audience
    setSelectedAudience(assignedAudience ?? audiencesQuery.data[0])
  }, [audiencesQuery.data, open, scopesAssignmentsQuery.data, selectedAudience])

  const scopesQuery = useQuery({
    queryKey: authorizationScopesQueryKey(selectedAudience ?? ''),
    queryFn: () => fetchAuthorizationScopes(selectedAudience!),
    enabled: open && Boolean(selectedAudience),
  })

  const scopeOptions = useMemo(() => {
    if (!scopesQuery.data) {
      return { aliases: [], scopes: [], openIdConnectAliases: [], openIdConnectScopes: [] }
    }

    const openIdConnect = scopesQuery.data.openid_connect_resources

    return {
      aliases: toScopeOptions(scopesQuery.data.aliases, m.groupScopesAlias()),
      scopes: toScopeOptions(scopesQuery.data.scopes, m.groupScopesScope()),
      openIdConnectAliases: showOpenIdConnectResources
        ? toScopeOptions(openIdConnect.aliases, m.groupScopesAlias())
        : [],
      openIdConnectScopes: showOpenIdConnectResources
        ? toScopeOptions(openIdConnect.scopes, m.groupScopesScope())
        : [],
    }
  }, [scopesQuery.data, showOpenIdConnectResources])

  const hasOpenIdConnectOptions =
    scopeOptions.openIdConnectAliases.length > 0 || scopeOptions.openIdConnectScopes.length > 0

  const assignedScopes = new Map(
    (scopesAssignmentsQuery.data ?? [])
      .filter((item) => item.audience === selectedAudience)
      .map((item) => [item.scope, item]),
  )

  const setSaving = (scope: string, saving: boolean) => {
    setSavingScopes((current) => {
      const next = new Set(current)
      if (saving) next.add(scope)
      else next.delete(scope)
      return next
    })
  }

  const toggleScope = async (scope: string, checked: boolean) => {
    if (!subject || !selectedAudience || subject.isSystem) return

    setSaving(scope, true)
    try {
      if (checked) {
        await createAssignment(subject.id, { audience: selectedAudience, scope })
      } else {
        const assignment = assignedScopes.get(scope)
        if (assignment) await deleteAssignment(subject.id, assignment.id)
      }

      await queryClient.invalidateQueries({ queryKey: queryKey(subject.id) })
      await queryClient.invalidateQueries({ queryKey: listQueryKey })
    } catch (error) {
      showErrorNotification(
        error instanceof Error ? error.message : m.groupScopesUnableToSave(),
        { title: m.groupScopesUnableToSave() },
      )
    } finally {
      setSaving(scope, false)
    }
  }

  const isLoading = audiencesQuery.isLoading || scopesAssignmentsQuery.isLoading
  const hasLoadError = audiencesQuery.isError || scopesAssignmentsQuery.isError

  const renderOptions = (options: typeof scopeOptions.scopes) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
        gap: 12,
        alignItems: 'stretch',
      }}
    >
      {options.map((option) => {
        const saving = savingScopes.has(option.value)
        return (
          <div
            key={option.value}
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              padding: '12px 16px',
              height: '100%',
            }}
          >
            <Checkbox
              checked={assignedScopes.has(option.value)}
              disabled={Boolean(subject?.isSystem) || saving}
              onChange={(event) => void toggleScope(option.value, event.target.checked)}
              style={{ width: '100%' }}
            >
              <Space size="small">
                <Typography.Text strong>{option.value}</Typography.Text>
                <Tag>{option.kind}</Tag>
                {saving ? <Spin size="small" /> : null}
              </Space>
              {option.description ? (
                <Typography.Text
                  type="secondary"
                  style={{ display: 'block', marginTop: 4 }}
                >
                  {option.description}
                </Typography.Text>
              ) : null}
            </Checkbox>
          </div>
        )
      })}
    </div>
  )

  // Without emptyText, an empty subsection is not rendered at all.
  const renderSubsection = (
    heading: string,
    options: typeof scopeOptions.scopes,
    emptyText?: string,
  ) =>
    options.length > 0 || emptyText ? (
      <div>
        <Typography.Title level={5}>{heading}</Typography.Title>
        {options.length > 0 ? (
          renderOptions(options)
        ) : (
          <Typography.Text type="secondary">{emptyText}</Typography.Text>
        )}
      </div>
    ) : null

  return (
    <Drawer
      open={open}
      width="min(1400px, 100vw)"
      title={subject ? title(subject.name) : m.groupScopesHeading()}
      onClose={onClose}
      destroyOnClose
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Typography.Text strong>{m.groupScopesAudience()}</Typography.Text>
          <Select
            value={selectedAudience}
            onChange={setSelectedAudience}
            showSearch
            optionFilterProp="label"
            placeholder={m.groupScopesSelectAudience()}
            options={(audiencesQuery.data ?? []).map((audience) => ({
              label: audience,
              value: audience,
            }))}
            loading={audiencesQuery.isLoading}
            style={{ display: 'block', width: '100%', marginTop: 8 }}
          />
        </div>

        {subject?.isSystem ? (
          <Typography.Text type="secondary">{systemReadOnly}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">{checkboxHelp}</Typography.Text>
        )}

        {isLoading ? (
          <Spin />
        ) : hasLoadError ? (
          <Typography.Text type="danger">{m.groupScopesUnableToLoad()}</Typography.Text>
        ) : selectedAudience && scopesQuery.isLoading ? (
          <Spin />
        ) : scopesQuery.isError ? (
          <Typography.Text type="danger">{m.groupScopesUnableToLoadOptions()}</Typography.Text>
        ) : scopeOptions.aliases.length === 0 &&
          scopeOptions.scopes.length === 0 &&
          !hasOpenIdConnectOptions ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.groupScopesNoOptions()} />
        ) : (
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            {hasOpenIdConnectOptions ? (
              <section>
                <Typography.Title level={4}>{m.groupScopesOpenIdConnectHeading()}</Typography.Title>
                <Typography.Paragraph type="secondary">
                  {m.groupScopesOpenIdConnectDescription()}
                </Typography.Paragraph>
                <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                  {renderSubsection(m.groupScopesAliasesHeading(), scopeOptions.openIdConnectAliases)}
                  {renderSubsection(m.groupScopesHeading(), scopeOptions.openIdConnectScopes)}
                </Space>
              </section>
            ) : null}
            <section>
              <Typography.Title level={4}>{m.groupScopesAudienceScopesHeading()}</Typography.Title>
              <Typography.Paragraph type="secondary">
                {m.groupScopesAudienceScopesDescription()}
              </Typography.Paragraph>
              <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                {renderSubsection(
                  m.groupScopesAliasesHeading(),
                  scopeOptions.aliases,
                  m.groupScopesNoAliases(),
                )}
                {renderSubsection(
                  m.groupScopesHeading(),
                  scopeOptions.scopes,
                  m.groupScopesNoScopes(),
                )}
              </Space>
            </section>
          </Space>
        )}
      </Space>
    </Drawer>
  )
}

export const GroupScopesDrawer = ({ group, open, onClose }: GroupScopesDrawerProps) => (
  <ScopeAssignmentsDrawer
    subject={group}
    open={open}
    onClose={onClose}
    queryKey={groupScopesQueryKey}
    fetchAssignments={fetchGroupScopes}
    createAssignment={createGroupScope}
    deleteAssignment={deleteGroupScope}
    listQueryKey={['groups.list']}
    title={(name) => m.groupScopesTitle({ group: name })}
    checkboxHelp={m.groupScopesCheckboxHelp()}
    systemReadOnly={m.groupScopesSystemReadOnly()}
  />
)
