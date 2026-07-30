import { useEffect } from 'react'
import { Button, Drawer, Form, Input, Select, Space, Switch } from 'antd'
import { z } from 'zod'
import type { Group } from '../../api/types'
import { MAX_USER_GROUPS } from '../../config'
import { m } from '../../paraglide/messages'

const GRANT_TYPES = ['client_credentials', 'password', 'authorization_code', 'refresh_token', 'implicit'] as const;

const GRANT_TYPE_LABELS: Record<typeof GRANT_TYPES[number], string> = {
  client_credentials: m.mainGrantClientCredentials(),
  password: m.mainPassword(),
  authorization_code: m.mainGrantAuthorizationCode(),
  refresh_token: m.mainGrantRefreshToken(),
  implicit: m.mainGrantImplicit(),
};

export type UserFormValues = {
  username: string
  password: string
  firstName: string
  lastName: string
  email: string
  grantTypes: string[]
  groups: string[]
  twoFaEnabled: boolean
}

type UserFormMode = 'create' | 'edit'

type UserFormDrawerProps = {
  open: boolean
  mode: UserFormMode
  initialValues?: Partial<UserFormValues>
  isSubmitting?: boolean
  availableGroups: Group[]
  onClose: () => void
  onSubmit: (values: UserFormValues) => void | Promise<void>
}

const usernameSchema = z
  .string()
  .min(1, m.validationUsernameRequired())
  .max(100, m.validationUsernameMaxLength())
  .regex(/^([\w0-9_-])+$/u, m.validationUsernamePattern())

const passwordSchema = z
  .string()
  .min(1, m.validationPasswordRequired())
  .max(50, m.validationPasswordMaxLength())

const firstNameSchema = z
  .string()
  .min(1, m.validationFirstNameRequired())
  .max(100, m.validationFirstNameMaxLength())

const lastNameSchema = z
  .string()
  .min(1, m.validationLastNameRequired())
  .max(100, m.validationLastNameMaxLength())

const emailSchema = z
  .string()
  .min(1, m.validationEmailRequired())
  .max(100, m.validationEmailMaxLength())
  .email(m.validationEmailValid())

const grantTypesSchema = z.array(z.string()).min(1, m.validationAtLeastOneGrantTypeRequired());
const groupsSchema = z
  .array(z.string())
  .max(MAX_USER_GROUPS, m.validationNoMoreThanGroupsSelected({ max: MAX_USER_GROUPS }));

const makeZodRule = (schema: z.ZodTypeAny) => ({
  validator: async (_: unknown, value: unknown) => {
    // antd forms will pass an empty array for an empty multi-select, but zod will see this as 'undefined' on safeParse.
    // We adjust to an empty array so zod can validate it correctly (e.g. min(1))
    const valueToParse = Array.isArray(value) && value.length === 0 ? [] : value ?? '';
    const result = schema.safeParse(valueToParse)
    if (result.success) return
    throw new Error(result.error.issues[0]?.message ?? m.validationInvalidValue())
  },
})

const makeOptionalZodRule = (schema: z.ZodTypeAny) => ({
  validator: async (_: unknown, value: unknown) => {
    if (value === undefined || value === '') return
    const result = schema.safeParse(value)
    if (result.success) return
    throw new Error(result.error.issues[0]?.message ?? m.validationInvalidValue())
  },
})

export const UserFormDrawer = ({
  open,
  mode,
  initialValues,
  isSubmitting = false,
  availableGroups,
  onClose,
  onSubmit,
}: UserFormDrawerProps) => {
  const [form] = Form.useForm<UserFormValues>()

  useEffect(() => {
    if (!open) {
      form.resetFields()
      return
    }

    form.setFieldsValue({
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      email: '',
      grantTypes: [...GRANT_TYPES],
      groups: [],
      twoFaEnabled: false,
      ...initialValues,
    })
  }, [form, initialValues, open])

  return (
    <Drawer
      open={open}
      width={480}
      title={mode === 'create' ? m.usersCreate() : m.usersEdit()}
      destroyOnClose
      forceRender
      onClose={onClose}
    >
      <Form
        layout="vertical"
        form={form}
        onFinish={onSubmit}
        autoComplete="off"
      >
        <Form.Item label={m.mainUsername()} name="username" required rules={[makeZodRule(usernameSchema)]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          label={m.mainPassword()}
          name="password"
          required={mode === 'create'}
          rules={[
            mode === 'create'
              ? makeZodRule(passwordSchema)
              : makeOptionalZodRule(passwordSchema),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item label={m.mainFirstName()} name="firstName" required rules={[makeZodRule(firstNameSchema)]}>
          <Input />
        </Form.Item>
        <Form.Item label={m.mainLastName()} name="lastName" required rules={[makeZodRule(lastNameSchema)]}>
          <Input />
        </Form.Item>
        <Form.Item label={m.mainEmail()} name="email" required rules={[makeZodRule(emailSchema)]}>
          <Input type="email" autoComplete="email" />
        </Form.Item>
        <Form.Item label={m.mainGrantTypes()} name="grantTypes" required rules={[makeZodRule(grantTypesSchema)]}>
          <Select mode="multiple" allowClear style={{ width: '100%' }} placeholder={m.mainPleaseSelect()}>
            {GRANT_TYPES.map((gt) => <Select.Option key={gt} value={gt}>{GRANT_TYPE_LABELS[gt]}</Select.Option>)}
          </Select>
        </Form.Item>
        <Form.Item label={m.mainGroups()} name="groups" rules={[makeZodRule(groupsSchema)]}>
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={m.groupsSearch()}
            maxCount={MAX_USER_GROUPS}
            options={availableGroups.map((group) => ({
              label: group.name,
              value: group.id,
            }))}
          />
        </Form.Item>
        <Form.Item label={m.mainTwoFactorAuthentication()} name="twoFaEnabled" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button onClick={onClose}>{m.mainCancel()}</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {mode === 'create' ? m.usersCreate() : m.mainSaveChanges()}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Drawer>
  )
}
