import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Result, Space, Spin, Typography } from 'antd'
import { createClientGroup } from '../api/clients/createGroup'
import { deleteClientGroup } from '../api/clients/deleteGroup'
import { updateClientGroup } from '../api/clients/updateGroup'
import { fetchClientGroups, clientGroupsQueryKey } from '../api/clients/fetchGroups'
import { fetchClientGroupClients } from '../api/clients/fetchGroupClients'
import type { Group, QueryPayload } from '../api/types'
import { ClientGroupFormDrawer, type ClientGroupFormValues } from '../components/Clients/GroupFormDrawer'
import { GroupTable } from '../components/Clients/GroupTable'
import { showErrorNotification } from '../ui/notifications'
import { DEFAULT_PAGE_SIZE } from '../config'

const ClientGroupsPage = () => {
  const queryClient = useQueryClient()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [page, setPage] = useState(0)
  const pageSize = DEFAULT_PAGE_SIZE
  const [orderBy, setOrderBy] = useState<Record<string, 'ASC' | 'DESC'>>({
    't.id': 'DESC',
  })
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [groupClientCounts, setGroupClientCounts] = useState<
    Record<string, { count: number; hasMore: boolean }>
  >({})
  const [groupClientCountsLoading, setGroupClientCountsLoading] = useState<
    Record<string, boolean>
  >({})

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim())
      setPage(0)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const groupsPayload: QueryPayload = {
    type: 'Group',
    alias: 't',
    limit: pageSize,
    offset: page * pageSize,
    orderBy,
    ...(searchTerm
      ? {
          query: 't.name LIKE :name',
          parameters: { name: `%${searchTerm}%` },
        }
      : {}),
  }

  const groupsQuery = useQuery({
    queryKey: clientGroupsQueryKey(groupsPayload),
    queryFn: () => fetchClientGroups(groupsPayload),
  })

  if (groupsQuery.isLoading) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Client Groups
        </Typography.Title>
        <Space>
          <Spin />
          <Typography.Text>Loading groups...</Typography.Text>
        </Space>
      </Space>
    )
  }

  if (groupsQuery.isError) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Client Groups
        </Typography.Title>
        <Result
          status="error"
          title="Unable to load groups"
          subTitle={
            groupsQuery.error instanceof Error
              ? groupsQuery.error.message
              : 'Unexpected error'
          }
        />
      </Space>
    )
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Client Groups
        </Typography.Title>
        <Button
          type="primary"
          onClick={() => {
            setDrawerMode('create')
            setSelectedGroup(null)
            setIsDrawerOpen(true)
          }}
        >
          Create group
        </Button>
      </div>
      <Typography.Paragraph>
        Manage and review client group access across your organization.
      </Typography.Paragraph>
      <Input
        placeholder="Search groups by name"
        value={searchInput}
        allowClear
        onChange={(event) => setSearchInput(event.target.value)}
        style={{ maxWidth: 320 }}
      />
      <GroupTable
        groups={groupsQuery.data?.items ?? []}
        isLoading={groupsQuery.isLoading}
        deletingId={deletingId}
        groupUserCounts={groupClientCounts}
        groupUserCountsLoading={groupClientCountsLoading}
        onEdit={(group) => {
          if (group.isSystem) {
            showErrorNotification('System groups cannot be edited.', {
              title: 'Edit group blocked',
            })
            return
          }

          setDrawerMode('edit')
          setSelectedGroup(group)
          setIsDrawerOpen(true)
        }}
        onDeleteOpenChange={async (group, open) => {
          if (!open) return
          if (group.isSystem) return
          if (groupClientCounts[group.id] || groupClientCountsLoading[group.id]) return

          setGroupClientCountsLoading((current) => ({ ...current, [group.id]: true }))
          try {
            const data = await fetchClientGroupClients(group.id)
            setGroupClientCounts((current) => ({
              ...current,
              [group.id]: { count: data.items.length, hasMore: data.hasMore },
            }))
          } catch (error) {
            showErrorNotification(
              error instanceof Error ? error.message : 'Unable to check group usage',
              { title: 'Unable to check group usage' },
            )
          } finally {
            setGroupClientCountsLoading((current) => ({
              ...current,
              [group.id]: false,
            }))
          }
        }}
        onDelete={async (group) => {
          if (group.isSystem) {
            showErrorNotification('System groups cannot be deleted.', {
              title: 'Delete group blocked',
            })
            return
          }

          setDeletingId(group.id)
          try {
            await deleteClientGroup(group.id)
            setPage(0)
            await queryClient.invalidateQueries({ queryKey: ['clients.groups.list'] })
          } catch (error) {
            showErrorNotification(
              error instanceof Error ? error.message : 'Unable to delete group',
              { title: 'Unable to delete group' },
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
          if (Object.keys(nextOrderBy).length === 0) {
            setOrderBy({ 't.id': 'DESC' })
            return
          }

          setOrderBy(nextOrderBy)
        }}
        sortOrderByField={{
          name:
            orderBy['t.name'] === 'ASC'
              ? 'ascend'
              : orderBy['t.name'] === 'DESC'
                ? 'descend'
                : undefined,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={page === 0 || groupsQuery.isFetching}
        >
          Previous
        </Button>
        <Button
          onClick={() => setPage((current) => current + 1)}
          disabled={!groupsQuery.data?.hasMore || groupsQuery.isFetching}
        >
          Next
        </Button>
      </div>
      <ClientGroupFormDrawer
        open={isDrawerOpen}
        mode={drawerMode}
        initialValues={selectedGroup ? { name: selectedGroup.name } : undefined}
        onClose={() => setIsDrawerOpen(false)}
        isSubmitting={isSubmitting}
        onSubmit={async (values: ClientGroupFormValues) => {
          setIsSubmitting(true)
          try {
            if (drawerMode === 'create') {
              await createClientGroup(values)
              setPage(0)
              await queryClient.invalidateQueries({ queryKey: ['clients.groups.list'] })
              setIsDrawerOpen(false)
              return
            }

            if (!selectedGroup) {
              throw new Error('No group selected for update')
            }

            if (selectedGroup.isSystem) {
              throw new Error('System groups cannot be edited')
            }

            await updateClientGroup(selectedGroup.id, values)
            await queryClient.invalidateQueries({ queryKey: ['clients.groups.list'] })
            setIsDrawerOpen(false)
          } catch (error) {
            showErrorNotification(
              error instanceof Error ? error.message : 'Unable to save group',
              { title: 'Unable to save group' },
            )
          } finally {
            setIsSubmitting(false)
          }
        }}
      />
    </Space>
  )
}

export default ClientGroupsPage
