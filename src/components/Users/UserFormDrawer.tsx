import { useEffect } from 'react'
import { Button, Drawer, Form, Input, Select, Space } from 'antd'
import { z } from 'zod'
import type { Group } from '../../api/types'
import { MAX_USER_GROUPS } from '../../config'

const GRANT_TYPES = ['client_credentials', 'password', 'authorization_code', 'refresh_token', 'implicit'] as const;

const GRANT_TYPE_LABELS: Record<typeof GRANT_TYPES[number], string> = {
  client_credentials: 'Client Credentials',
  password: 'Password',
  authorization_code: 'Authorization Code',
  refresh_token: 'Refresh Token',
  implicit: 'Implicit',
};

export type UserFormValues = {
  username: string
  password: string
  firstName: string
  lastName: string
  email: string
  grantTypes: string[]
  groups: string[]
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
  .min(1, 'Username is required')
  .max(100, 'Username must be 100 characters or less')
  .regex(/^([\w0-9_-])+$/u, 'Username can only include letters, numbers, "_" and "-"')

const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .max(50, 'Password must be 50 characters or less')

const firstNameSchema = z
  .string()
  .min(1, 'First name is required')
  .max(100, 'First name must be 100 characters or less')

const lastNameSchema = z
  .string()
  .min(1, 'Last name is required')
  .max(100, 'Last name must be 100 characters or less')

const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(100, 'Email must be 100 characters or less')
  .email('Email must be valid')

const grantTypesSchema = z.array(z.string()).min(1, 'At least one grant type is required');
const groupsSchema = z
  .array(z.string())
  .max(MAX_USER_GROUPS, `No more than ${MAX_USER_GROUPS} groups can be selected`);

const makeZodRule = (schema: z.ZodTypeAny) => ({
  validator: async (_: unknown, value: unknown) => {
    // antd forms will pass an empty array for an empty multi-select, but zod will see this as 'undefined' on safeParse.
    // We adjust to an empty array so zod can validate it correctly (e.g. min(1))
    const valueToParse = Array.isArray(value) && value.length === 0 ? [] : value ?? '';
    const result = schema.safeParse(valueToParse)
    if (result.success) return
    throw new Error(result.error.issues[0]?.message ?? 'Invalid value')
  },
})

const makeOptionalZodRule = (schema: z.ZodTypeAny) => ({
  validator: async (_: unknown, value: unknown) => {
    if (value === undefined || value === '') return
    const result = schema.safeParse(value)
    if (result.success) return
    throw new Error(result.error.issues[0]?.message ?? 'Invalid value')
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
      ...initialValues,
    })
  }, [form, initialValues, open])

  return (
    <Drawer
      open={open}
      width={480}
      title={mode === 'create' ? 'Create user' : 'Edit user'}
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
        <Form.Item label="Username" name="username" required rules={[makeZodRule(usernameSchema)]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="Password"
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
        <Form.Item label="First name" name="firstName" required rules={[makeZodRule(firstNameSchema)]}>
          <Input />
        </Form.Item>
        <Form.Item label="Last name" name="lastName" required rules={[makeZodRule(lastNameSchema)]}>
          <Input />
        </Form.Item>
        <Form.Item label="Email" name="email" required rules={[makeZodRule(emailSchema)]}>
          <Input type="email" autoComplete="email" />
        </Form.Item>
        <Form.Item label="Grant types" name="grantTypes" required rules={[makeZodRule(grantTypesSchema)]}>
          <Select mode="multiple" allowClear style={{ width: '100%' }} placeholder="Please select">
            {GRANT_TYPES.map((gt) => <Select.Option key={gt} value={gt}>{GRANT_TYPE_LABELS[gt]}</Select.Option>)}
          </Select>
        </Form.Item>
        <Form.Item label="Groups" name="groups" rules={[makeZodRule(groupsSchema)]}>
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Search groups"
            maxCount={MAX_USER_GROUPS}
            options={availableGroups.map((group) => ({
              label: group.name,
              value: group.id,
            }))}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {mode === 'create' ? 'Create user' : 'Save changes'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Drawer>
  )
}
