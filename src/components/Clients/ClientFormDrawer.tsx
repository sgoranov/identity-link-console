import { useEffect } from 'react'
import { Button, Drawer, Form, Input, Select, Space, Switch } from 'antd'
import { z } from 'zod'
import type { Group } from '../../api/types'
import { MAX_CLIENT_GROUPS } from '../../config'

const GRANT_TYPES = [
  'client_credentials',
  'password',
  'authorization_code',
  'refresh_token',
  'implicit',
] as const

const GRANT_TYPE_LABELS: Record<typeof GRANT_TYPES[number], string> = {
  client_credentials: 'Client Credentials',
  password: 'Password',
  authorization_code: 'Authorization Code',
  refresh_token: 'Refresh Token',
  implicit: 'Implicit',
}

export type ClientFormValues = {
  name: string
  description: string
  redirectUri: string[]
  groups: string[]
  grantTypes: string[]
  scopes: string[]
  isPublic?: boolean
}

type ClientFormMode = 'create' | 'edit'

type ClientFormDrawerProps = {
  open: boolean
  mode: ClientFormMode
  initialValues?: Partial<ClientFormValues>
  isSubmitting?: boolean
  availableGroups: Group[]
  onClose: () => void
  onSubmit: (values: ClientFormValues) => void | Promise<void>
}

const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be 100 characters or less')
  .regex(/^([\w0-9_-])+$/u, 'Name can only include letters, numbers, "_" and "-"')

const descriptionSchema = z
  .string()
  .min(1, 'Description is required')
  .max(3000, 'Description must be 3000 characters or less')

const redirectUriSchema = z
  .array(
    z
      .string()
      .min(1, 'Redirect URI is required')
      .max(3000, 'Redirect URI must be 3000 characters or less')
      .url('Redirect URI must be valid'),
  )
  .min(1, 'At least one redirect URI is required')
  .max(50, 'You cannot specify more than 50 redirect URIs')

const groupsSchema = z
  .array(z.string())
  .max(MAX_CLIENT_GROUPS, `You cannot specify more than ${MAX_CLIENT_GROUPS} groups`)

const grantTypesSchema = z.array(z.string())

const scopesSchema = z.array(z.string())

const makeZodRule = (schema: z.ZodTypeAny) => ({
  validator: async (_: unknown, value: unknown) => {
    const valueToParse =
      schema instanceof z.ZodArray
        ? Array.isArray(value)
          ? value
          : value === undefined
            ? []
            : [value]
        : value ?? ''
    const result = schema.safeParse(valueToParse)
    if (result.success) return
    throw new Error(result.error.issues[0]?.message ?? 'Invalid value')
  },
})

export const ClientFormDrawer = ({
  open,
  mode,
  initialValues,
  isSubmitting = false,
  availableGroups,
  onClose,
  onSubmit,
}: ClientFormDrawerProps) => {
  const [form] = Form.useForm<ClientFormValues>()

  useEffect(() => {
    if (!open) {
      form.resetFields()
      return
    }

    form.setFieldsValue({
      name: '',
      description: '',
      redirectUri: [],
      groups: [],
      grantTypes: [],
      scopes: [],
      ...initialValues,
    })
  }, [form, initialValues, open])

  return (
    <Drawer
      open={open}
      width={520}
      title={mode === 'create' ? 'Create client' : 'Edit client'}
      destroyOnClose
      forceRender
      onClose={onClose}
    >
      <Form layout="vertical" form={form} onFinish={onSubmit} autoComplete="off">
        <Form.Item label="Name" name="name" required rules={[makeZodRule(nameSchema)]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="Description"
          name="description"
          required
          rules={[makeZodRule(descriptionSchema)]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item
          label="Redirect URIs"
          name="redirectUri"
          required
          rules={[makeZodRule(redirectUriSchema)]}
        >
          <Select
            mode="tags"
            tokenSeparators={[',', ' ']}
            placeholder="Add redirect URIs"
          />
        </Form.Item>
        <Form.Item label="Groups" name="groups" rules={[makeZodRule(groupsSchema)]}>
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Search groups"
            maxCount={MAX_CLIENT_GROUPS}
            options={availableGroups.map((group) => ({
              label: group.name,
              value: group.id,
            }))}
          />
        </Form.Item>
        <Form.Item label="Grant types" name="grantTypes" rules={[makeZodRule(grantTypesSchema)]}>
          <Select mode="multiple" allowClear placeholder="Select grant types">
            {GRANT_TYPES.map((gt) => (
              <Select.Option key={gt} value={gt}>
                {GRANT_TYPE_LABELS[gt]}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="Scopes" name="scopes" rules={[makeZodRule(scopesSchema)]}>
          <Select mode="tags" tokenSeparators={[',', ' ']} placeholder="Add scopes" />
        </Form.Item>
        {mode === 'create' ? (
          <Form.Item label="Public client" name="isPublic" valuePropName="checked">
            <Switch />
          </Form.Item>
        ) : null}
        <Form.Item>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {mode === 'create' ? 'Create client' : 'Save changes'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Drawer>
  )
}
