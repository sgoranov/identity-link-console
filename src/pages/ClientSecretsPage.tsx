import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Result, Space, Spin, Typography } from 'antd'
import { useParams, useNavigate } from '@tanstack/react-router'
import {
  fetchClientSecrets,
  clientSecretsQueryKey,
} from '../api/clients/fetchClientSecrets'
import { fetchClient, clientQueryKey } from '../api/clients/fetchClient'
import { deleteClientSecret } from '../api/clients/deleteSecret'
import { createClientSecret } from '../api/clients/createSecret'
import type { QueryPayload } from '../api/types'
import { ClientSecretsTable } from '../components/Clients/ClientSecretsTable'
import {
  ClientSecretFormDrawer,
  type ClientSecretFormValues,
} from '../components/Clients/ClientSecretFormDrawer'
import { showErrorNotification } from '../ui/notifications'
import { DEFAULT_PAGE_SIZE } from '../config'

const ClientSecretsPage = () => {
  const queryClient = useQueryClient()
  const { clientId } = useParams({ from: '/clients/$clientId/secrets' })
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const pageSize = DEFAULT_PAGE_SIZE
  const [orderBy, setOrderBy] = useState<Record<string, 'ASC' | 'DESC'>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const drawerMode: 'create' | 'edit' = 'create'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null)

  const secretsPayload: QueryPayload = {
    type: 'Secret',
    alias: 't',
    limit: pageSize,
    offset: page * pageSize,
    ...(Object.keys(orderBy).length > 0 ? { orderBy } : {}),
  }

  const secretsQuery = useQuery({
    queryKey: clientSecretsQueryKey(clientId, secretsPayload),
    queryFn: () => fetchClientSecrets(clientId, secretsPayload),
  })

  const clientQuery = useQuery({
    queryKey: clientQueryKey(clientId),
    queryFn: () => fetchClient(clientId),
  })

  if (secretsQuery.isLoading) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Client Secrets
        </Typography.Title>
        <Space>
          <Spin />
          <Typography.Text>Loading secrets...</Typography.Text>
        </Space>
      </Space>
    )
  }

  if (secretsQuery.isError) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Client Secrets
        </Typography.Title>
        <Result
          status="error"
          title="Unable to load secrets"
          subTitle={
            secretsQuery.error instanceof Error
              ? secretsQuery.error.message
              : 'Unexpected error'
          }
        />
      </Space>
    )
  }

  const clientName = clientQuery.data?.name ?? 'Client'
  const clientDescription = clientQuery.data?.description
  const isSystemClient = Boolean(clientQuery.data?.isSystem)

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Client Secrets
          </Typography.Title>
          <div style={{ display: 'flex', gap: 8 }}>
          <Button
            type="primary"
            disabled={clientQuery.isLoading || isSystemClient}
            onClick={() => {
              setIsDrawerOpen(true)
            }}
          >
            Generate secret
          </Button>
          <Button onClick={() => navigate({ to: '/clients' })}>Back to clients</Button>
        </div>
      </div>
      <div>
        <Typography.Paragraph style={{ marginBottom: 4 }}>
          <Typography.Text strong>{clientName}</Typography.Text>
        </Typography.Paragraph>
        <Typography.Text type="secondary" style={{ display: 'block' }}>
          {clientId}
        </Typography.Text>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
          {clientDescription || 'Manage secrets for this client.'}
        </Typography.Paragraph>
      </div>
      <ClientSecretsTable
        secrets={secretsQuery.data?.items ?? []}
        isLoading={secretsQuery.isLoading}
        deletingId={deletingId}
        onDelete={async (secret) => {
          if (secret.isSystem) {
            showErrorNotification('System secrets cannot be deleted.', {
              title: 'Delete secret blocked',
            })
            return
          }

          setDeletingId(secret.id)
          try {
            await deleteClientSecret(secret.id)
            setPage(0)
            await queryClient.invalidateQueries({ queryKey: ['clients.secrets.list'] })
          } catch (error) {
            showErrorNotification(
              error instanceof Error ? error.message : 'Unable to delete secret',
              { title: 'Unable to delete secret' },
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
          expirationDateTime:
            orderBy['t.expirationDateTime'] === 'ASC'
              ? 'ascend'
              : orderBy['t.expirationDateTime'] === 'DESC'
                ? 'descend'
                : undefined,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={page === 0 || secretsQuery.isFetching}
        >
          Previous
        </Button>
        <Button
          onClick={() => setPage((current) => current + 1)}
          disabled={!secretsQuery.data?.hasMore || secretsQuery.isFetching}
        >
          Next
        </Button>
      </div>
      {generatedSecret ? (
        <div
          style={{
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            padding: 16,
            background: '#fafafa',
          }}
        >
          <Typography.Title level={5} style={{ margin: 0 }}>
            Generated secret
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginTop: 4 }}>
            Store this value securely. You will not be able to view it again once dismissed.
          </Typography.Paragraph>
          <Space align="start" direction="vertical" style={{ width: '100%' }}>
            <Input.Password value={generatedSecret} readOnly />
            <Space>
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(generatedSecret)
                  } catch (error) {
                    showErrorNotification(
                      error instanceof Error ? error.message : 'Unable to copy secret',
                      { title: 'Copy failed' },
                    )
                  }
                }}
              >
                Copy
              </Button>
              <Button onClick={() => setGeneratedSecret(null)}>Dismiss</Button>
            </Space>
          </Space>
        </div>
      ) : null}
      <ClientSecretFormDrawer
        open={isDrawerOpen}
        mode={drawerMode}
        isSubmitting={isSubmitting}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={async (values: ClientSecretFormValues) => {
          setIsSubmitting(true)
          try {
            if (drawerMode === 'create') {
              if (clientQuery.isLoading) {
                throw new Error('Client details are still loading')
              }

              if (isSystemClient) {
                throw new Error('System client secrets cannot be changed')
              }

              if (!values.expirationPeriod) {
                throw new Error('Expiration period is required')
              }

              const createdSecret = await createClientSecret({
                client: clientId,
                passwordHint: values.passwordHint || undefined,
                expirationPeriod: values.expirationPeriod,
              })
              setGeneratedSecret(createdSecret.password)
              setPage(0)
              await queryClient.invalidateQueries({ queryKey: ['clients.secrets.list'] })
              setIsDrawerOpen(false)
              return
            }
            setIsDrawerOpen(false)
          } catch (error) {
            showErrorNotification(
              error instanceof Error ? error.message : 'Unable to save secret',
              { title: 'Unable to save secret' },
            )
          } finally {
            setIsSubmitting(false)
          }
        }}
      />
    </Space>
  )
}

export default ClientSecretsPage
