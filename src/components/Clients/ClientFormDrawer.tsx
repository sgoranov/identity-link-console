import { useEffect } from 'react'
import { Button, Drawer, Form, Input, Select, Space, Switch } from 'antd'
import { z } from 'zod'
import type { Group } from '../../api/types'
import { MAX_CLIENT_GROUPS } from '../../config'
import { m } from '../../paraglide/messages'

const GRANT_TYPES = [
  'client_credentials',
  'password',
  'authorization_code',
  'refresh_token',
  'implicit',
] as const

const GRANT_TYPE_LABELS: Record<typeof GRANT_TYPES[number], string> = {
  client_credentials: m.mainGrantClientCredentials(),
  password: m.mainPassword(),
  authorization_code: m.mainGrantAuthorizationCode(),
  refresh_token: m.mainGrantRefreshToken(),
  implicit: m.mainGrantImplicit(),
}

export type ClientFormValues = {
  name: string
  description: string
  redirectUri: string[]
  groups: string[]
  grantTypes: string[]
  scopes: string[]
  isPublic?: boolean
  consentRequired?: boolean
  applicationUrl: string
  termsOfServiceUrl: string
  privacyPolicyUrl: string
  logoUrl: string
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
  .min(1, m.validationNameRequired())
  .max(100, m.validationNameMaxLength())
  .regex(/^([\w0-9_-])+$/u, m.validationNamePattern())

const descriptionSchema = z
  .string()
  .min(1, m.validationDescriptionRequired())
  .max(3000, m.validationDescriptionMaxLength())

const redirectUriSchema = z
  .array(
    z
      .string()
      .min(1, m.validationRedirectUriRequired())
      .max(3000, m.validationRedirectUriMaxLength())
      .url(m.validationRedirectUriValid()),
  )
  .min(1, m.validationAtLeastOneRedirectUriRequired())
  .max(50, m.validationCannotSpecifyMoreThanRedirectUris())

const uriSchema = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string()
    .max(3000, m.validationRedirectUriMaxLength())
    .url(m.validationUriValid())
    .optional()
);

const groupsSchema = z
  .array(z.string())
  .max(MAX_CLIENT_GROUPS, m.validationCannotSpecifyMoreThanGroups({ max: MAX_CLIENT_GROUPS }))

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
    throw new Error(result.error.issues[0]?.message ?? m.validationInvalidValue())
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
      title={mode === 'create' ? m.clientsCreate() : m.clientsEdit()}
      destroyOnClose
      forceRender
      onClose={onClose}
    >
      <Form layout="vertical" form={form} onFinish={onSubmit} autoComplete="off">
        <Form.Item label={m.mainName()} name="name" required rules={[makeZodRule(nameSchema)]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          label={m.mainDescription()}
          name="description"
          required
          rules={[makeZodRule(descriptionSchema)]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item
          label={m.clientsFormRedirectUris()}
          name="redirectUri"
          required
          rules={[makeZodRule(redirectUriSchema)]}
        >
          <Select
            mode="tags"
            tokenSeparators={[',', ' ']}
            placeholder={m.clientsFormAddRedirectUris()}
          />
        </Form.Item>
        <Form.Item label={m.mainGroups()} name="groups" rules={[makeZodRule(groupsSchema)]}>
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={m.groupsSearch()}
            maxCount={MAX_CLIENT_GROUPS}
            options={availableGroups.map((group) => ({
              label: group.name,
              value: group.id,
            }))}
          />
        </Form.Item>
        <Form.Item label={m.mainGrantTypes()} name="grantTypes" rules={[makeZodRule(grantTypesSchema)]}>
          <Select mode="multiple" allowClear placeholder={m.clientsFormSelectGrantTypes()}>
            {GRANT_TYPES.map((gt) => (
              <Select.Option key={gt} value={gt}>
                {GRANT_TYPE_LABELS[gt]}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label={m.clientsFormScopes()} name="scopes" rules={[makeZodRule(scopesSchema)]}>
          <Select mode="tags" tokenSeparators={[',', ' ']} placeholder={m.clientsFormAddScopes()} />
        </Form.Item>
        {mode === 'create' ? (
          <Form.Item label={m.clientsFormPublicClient()} name="isPublic" valuePropName="checked">
            <Switch />
          </Form.Item>
        ) : null}
        <Form.Item label={m.clientsFormConsentRequired()} name="consentRequired" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label={m.clientsFormApplicationUrl()} name="applicationUrl" rules={[makeZodRule(uriSchema)]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item label={m.clientsFormTermsOfServiceUrl()} name="termsOfServiceUrl" rules={[makeZodRule(uriSchema)]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item label={m.clientsFormPrivacyPolicyUrl()} name="privacyPolicyUrl" rules={[makeZodRule(uriSchema)]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item label={m.clientsFormLogoUrl()} name="logoUrl" rules={[makeZodRule(uriSchema)]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button onClick={onClose}>{m.mainCancel()}</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {mode === 'create' ? m.clientsCreate() : m.mainSaveChanges()}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Drawer>
  )
}
