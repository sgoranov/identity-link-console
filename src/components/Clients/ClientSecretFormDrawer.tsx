import { useEffect } from 'react'
import { Button, Drawer, Form, Input, Select, Space } from 'antd'
import { z } from 'zod'

export type ClientSecretFormValues = {
  passwordHint?: string
  expirationPeriod?: string
}

type ClientSecretFormMode = 'create' | 'edit'

type ClientSecretFormDrawerProps = {
  open: boolean
  mode: ClientSecretFormMode
  initialValues?: Partial<ClientSecretFormValues>
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (values: ClientSecretFormValues) => void | Promise<void>
}

const hintSchema = z.string().max(200, 'Password hint must be 200 characters or less')
const expirationSchema = z
  .string()
  .min(1, 'Expiration period is required')
  .max(50, 'Expiration period must be 50 characters or less')

const makeOptionalZodRule = (schema: z.ZodTypeAny) => ({
  validator: async (_: unknown, value: unknown) => {
    if (value === undefined || value === '') return
    const result = schema.safeParse(value)
    if (result.success) return
    throw new Error(result.error.issues[0]?.message ?? 'Invalid value')
  },
})

const makeZodRule = (schema: z.ZodTypeAny) => ({
  validator: async (_: unknown, value: unknown) => {
    const result = schema.safeParse(value ?? '')
    if (result.success) return
    throw new Error(result.error.issues[0]?.message ?? 'Invalid value')
  },
})

export const ClientSecretFormDrawer = ({
  open,
  mode,
  initialValues,
  isSubmitting = false,
  onClose,
  onSubmit,
}: ClientSecretFormDrawerProps) => {
  const [form] = Form.useForm<ClientSecretFormValues>()
  const expirationOptions = [
    { label: '1 day', value: '1d' },
    { label: '1 week', value: '1w' },
    { label: '1 month', value: '1m' },
    { label: '3 months', value: '3m' },
    { label: '9 months', value: '9m' },
    { label: '1 year', value: '1y' },
    { label: '2 years', value: '2y' },
  ]

  useEffect(() => {
    if (!open) {
      form.resetFields()
      return
    }

    form.setFieldsValue({
      passwordHint: '',
      expirationPeriod: '',
      ...initialValues,
    })
  }, [form, initialValues, open])

  return (
    <Drawer
      open={open}
      width={420}
      title={mode === 'create' ? 'Generate secret' : 'Edit secret'}
      destroyOnClose
      forceRender
      onClose={onClose}
    >
      <Form layout="vertical" form={form} onFinish={onSubmit} autoComplete="off">
        <Form.Item
          label="Password hint"
          name="passwordHint"
          rules={[makeOptionalZodRule(hintSchema)]}
        >
          <Input placeholder="Optional hint" />
        </Form.Item>
        {mode === 'create' ? (
          <Form.Item
            label="Expiration period"
            name="expirationPeriod"
            required
            rules={[makeZodRule(expirationSchema)]}
          >
            <Select
              placeholder="Select expiration period"
              options={expirationOptions}
            />
          </Form.Item>
        ) : null}
        <Form.Item>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {mode === 'create' ? 'Generate secret' : 'Save changes'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Drawer>
  )
}
