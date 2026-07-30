import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Result, Space, Spin, Typography } from 'antd'
import { useNavigate } from '@tanstack/react-router'
import { fetchClients, clientsQueryKey } from '../api/clients/fetchClients'
import { fetchClientGroups, clientGroupsQueryKey } from '../api/clients/fetchGroups'
import { createClient } from '../api/clients/createClient'
import { updateClient } from '../api/clients/updateClient'
import { deleteClient } from '../api/clients/deleteClient'
import type { QueryPayload } from '../api/types'
import { ClientTable } from '../components/Clients/ClientTable'
import { ClientFormDrawer, type ClientFormValues } from '../components/Clients/ClientFormDrawer'
import { showErrorNotification } from '../ui/notifications'
import { DEFAULT_PAGE_SIZE } from '../config'
import { m } from '../paraglide/messages'

const ClientsPage = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const pageSize = DEFAULT_PAGE_SIZE
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [orderBy, setOrderBy] = useState<Record<string, 'ASC' | 'DESC'>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [selectedClient, setSelectedClient] = useState<
    (ClientFormValues & { id?: string; isSystem?: boolean }) | null
  >(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim())
      setPage(0)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const clientsPayload: QueryPayload = {
    type: 'Client',
    alias: 't',
    limit: pageSize,
    offset: page * pageSize,
    ...(Object.keys(orderBy).length > 0 ? { orderBy } : {}),
    ...(searchTerm
      ? {
          query: 't.name LIKE :term',
          parameters: { term: `%${searchTerm}%` },
        }
      : {}),
  }

  const clientsQuery = useQuery({
    queryKey: clientsQueryKey(clientsPayload),
    queryFn: () => fetchClients(clientsPayload),
  })

  const groupsPayload: QueryPayload = {
    type: 'Group',
    alias: 't',
    limit: DEFAULT_PAGE_SIZE,
    offset: 0,
    orderBy: { 't.name': 'ASC' },
  }

  const groupsQuery = useQuery({
    queryKey: clientGroupsQueryKey(groupsPayload),
    queryFn: () => fetchClientGroups(groupsPayload),
  })

  if (clientsQuery.isLoading) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {m.clientsTitle()}
        </Typography.Title>
        <Space>
          <Spin />
          <Typography.Text>{m.clientsLoading()}</Typography.Text>
        </Space>
      </Space>
    )
  }

  if (clientsQuery.isError) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {m.clientsTitle()}
        </Typography.Title>
        <Result
          status="error"
          title={m.clientsUnableToLoad()}
          subTitle={
            clientsQuery.error instanceof Error
              ? clientsQuery.error.message
              : m.mainUnexpectedError()
          }
        />
      </Space>
    )
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {m.clientsTitle()}
        </Typography.Title>
        <Button
          type="primary"
          onClick={() => {
            setDrawerMode('create')
            setSelectedClient(null)
            setIsDrawerOpen(true)
          }}
        >
          {m.clientsCreate()}
        </Button>
      </div>
      <Typography.Paragraph>{m.clientsDescription()}</Typography.Paragraph>
      <Input
        placeholder={m.clientsSearchByName()}
        value={searchInput}
        allowClear
        onChange={(event) => setSearchInput(event.target.value)}
        style={{ maxWidth: 320 }}
      />
      <ClientTable
        clients={clientsQuery.data?.items ?? []}
        availableGroups={groupsQuery.data?.items ?? []}
        isLoading={clientsQuery.isLoading || groupsQuery.isLoading}
        deletingId={deletingId}
        onViewSecrets={(client) => {
          navigate({ to: '/clients/$clientId/secrets', params: { clientId: client.id } })
        }}
        onEdit={(client) => {
          if (client.isSystem) {
            showErrorNotification(m.clientsSystemCannotBeEditedWithPeriod(), {
              title: m.clientsEditBlocked(),
            })
            return
          }

          setDrawerMode('edit')
          setSelectedClient({
            id: client.id,
            isSystem: client.isSystem,
            name: client.name,
            description: client.description ?? '',
            redirectUri: client.redirectUri ?? [],
            groups: client.groups?.data ?? [],
            grantTypes: client.grantTypes ?? [],
            scopes: client.scopes ?? [],
            isPublic: Boolean(client.public),
            consentRequired: Boolean(client.consentRequired),
            applicationUrl: client.applicationUrl ?? null,
            termsOfServiceUrl: client.termsOfServiceUrl ?? null,
            privacyPolicyUrl: client.privacyPolicyUrl ?? null,
            logoUrl: client.logoUrl ?? null,
          })
          setIsDrawerOpen(true)
        }}
        onDelete={async (client) => {
          if (client.isSystem) {
            showErrorNotification(m.clientsSystemCannotBeDeleted(), {
              title: m.clientsDeleteBlocked(),
            })
            return
          }

          setDeletingId(client.id)
          try {
            await deleteClient(client.id)
            setPage(0)
            await queryClient.invalidateQueries({ queryKey: ['clients.list'] })
          } catch (error) {
            showErrorNotification(
              error instanceof Error ? error.message : m.clientsUnableToDelete(),
              { title: m.clientsUnableToDelete() },
            )
          } finally {
            setDeletingId(null)
          }
        }}
        onSortChange={(sorter) => {
          const sorters = Array.isArray(sorter) ? sorter : [sorter]
          const nextOrderBy: Record<string, 'ASC' | 'DESC'> = {}

          sorters.forEach((sort) => {
            if (!sort.field || !sort.order) return
            const fieldName = String(sort.field)
            const key = `t.${fieldName}`
            nextOrderBy[key] = sort.order === 'ascend' ? 'ASC' : 'DESC'
          })

          setPage(0)
          setOrderBy(nextOrderBy)
        }}
        sortOrderByField={{
          name:
            orderBy['t.name'] === 'ASC'
              ? 'ascend'
              : orderBy['t.name'] === 'DESC'
                ? 'descend'
                : undefined,
          public:
            orderBy['t.public'] === 'ASC'
              ? 'ascend'
              : orderBy['t.public'] === 'DESC'
                ? 'descend'
                : undefined,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={page === 0 || clientsQuery.isFetching}
        >
          {m.mainPrevious()}
        </Button>
        <Button
          onClick={() => setPage((current) => current + 1)}
          disabled={!clientsQuery.data?.hasMore || clientsQuery.isFetching}
        >
          {m.mainNext()}
        </Button>
      </div>
      <ClientFormDrawer
        open={isDrawerOpen}
        mode={drawerMode}
        availableGroups={groupsQuery.data?.items ?? []}
        initialValues={selectedClient ?? undefined}
        isSubmitting={isSubmitting}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={async (values: ClientFormValues) => {
          setIsSubmitting(true)
          try {
            if (drawerMode === 'create') {
              await createClient({
                name: values.name,
                description: values.description,
                redirectUri: values.redirectUri,
                groups: values.groups,
                grantTypes: values.grantTypes,
                scopes: values.scopes,
                isPublic: Boolean(values.isPublic),
                consentRequired: Boolean(values.consentRequired),
                applicationUrl: values.applicationUrl || null,
                termsOfServiceUrl: values.termsOfServiceUrl || null,
                privacyPolicyUrl: values.privacyPolicyUrl || null,
                logoUrl: values.logoUrl || null,
              })
              setPage(0)
              await queryClient.invalidateQueries({ queryKey: ['clients.list'] })
              setIsDrawerOpen(false)
              return
            }

            if (!selectedClient?.id) {
              throw new Error(m.clientsNoSelectedForUpdate())
            }

            if (selectedClient.isSystem) {
              throw new Error(m.clientsSystemCannotBeEdited())
            }

            await updateClient(selectedClient.id, {
              name: values.name,
              description: values.description,
              redirectUri: values.redirectUri,
              groups: values.groups,
              grantTypes: values.grantTypes,
              scopes: values.scopes,
              consentRequired: Boolean(values.consentRequired),
              applicationUrl: values.applicationUrl || null,
              termsOfServiceUrl: values.termsOfServiceUrl || null,
              privacyPolicyUrl: values.privacyPolicyUrl || null,
              logoUrl: values.logoUrl || null,
            })
            await queryClient.invalidateQueries({ queryKey: ['clients.list'] })
            setIsDrawerOpen(false)
          } catch (error) {
            showErrorNotification(
              error instanceof Error ? error.message : m.clientsUnableToSave(),
              { title: m.clientsUnableToSave() },
            )
          } finally {
            setIsSubmitting(false)
          }
        }}
      />
    </Space>
  )
}

export default ClientsPage
