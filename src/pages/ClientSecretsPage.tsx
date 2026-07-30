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
import { m } from '../paraglide/messages'

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
          {m.clientSecretsTitle()}
        </Typography.Title>
        <Space>
          <Spin />
          <Typography.Text>{m.clientSecretsLoading()}</Typography.Text>
        </Space>
      </Space>
    )
  }

  if (secretsQuery.isError) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {m.clientSecretsTitle()}
        </Typography.Title>
        <Result
          status="error"
          title={m.clientSecretsUnableToLoad()}
          subTitle={
            secretsQuery.error instanceof Error
              ? secretsQuery.error.message
              : m.mainUnexpectedError()
          }
        />
      </Space>
    )
  }

  const clientName = clientQuery.data?.name ?? m.clientSecretsClientFallback()
  const clientDescription = clientQuery.data?.description
  const isSystemClient = Boolean(clientQuery.data?.isSystem)

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography.Title level={2} style={{ margin: 0 }}>
            {m.clientSecretsTitle()}
          </Typography.Title>
          <div style={{ display: 'flex', gap: 8 }}>
          <Button
            type="primary"
            disabled={clientQuery.isLoading || isSystemClient}
            onClick={() => {
              setIsDrawerOpen(true)
            }}
          >
            {m.clientSecretsGenerate()}
          </Button>
          <Button onClick={() => navigate({ to: '/clients' })}>{m.clientSecretsBackToClients()}</Button>
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
          {clientDescription || m.clientSecretsDescriptionFallback()}
        </Typography.Paragraph>
      </div>
      <ClientSecretsTable
        secrets={secretsQuery.data?.items ?? []}
        isLoading={secretsQuery.isLoading}
        deletingId={deletingId}
        onDelete={async (secret) => {
          if (secret.isSystem) {
            showErrorNotification(m.clientSecretsSystemCannotBeDeleted(), {
              title: m.clientSecretsDeleteBlocked(),
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
              error instanceof Error ? error.message : m.clientSecretsUnableToDelete(),
              { title: m.clientSecretsUnableToDelete() },
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
          {m.mainPrevious()}
        </Button>
        <Button
          onClick={() => setPage((current) => current + 1)}
          disabled={!secretsQuery.data?.hasMore || secretsQuery.isFetching}
        >
          {m.mainNext()}
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
            {m.clientSecretsGenerated()}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginTop: 4 }}>
            {m.clientSecretsStoreSecurely()}
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
                        error instanceof Error ? error.message : m.clientSecretsUnableToCopy(),
                      { title: m.clientSecretsCopyFailed() },
                    )
                  }
                }}
              >
                {m.mainCopy()}
              </Button>
              <Button onClick={() => setGeneratedSecret(null)}>{m.mainDismiss()}</Button>
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
                throw new Error(m.clientSecretsDetailsStillLoading())
              }

              if (isSystemClient) {
                throw new Error(m.clientSecretsSystemCannotBeChanged())
              }

              if (!values.expirationPeriod) {
                throw new Error(m.validationExpirationPeriodRequired())
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
              error instanceof Error ? error.message : m.clientSecretsUnableToSave(),
              { title: m.clientSecretsUnableToSave() },
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
