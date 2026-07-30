import { useEffect } from 'react'
import { Button, Drawer, Form, Input, Select, Space } from 'antd'
import { z } from 'zod'
import { m } from '../../paraglide/messages'

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

const hintSchema = z.string().max(200, m.validationPasswordHintMaxLength())
const expirationSchema = z
  .string()
  .min(1, m.validationExpirationPeriodRequired())
  .max(50, m.validationExpirationPeriodMaxLength())

const makeOptionalZodRule = (schema: z.ZodTypeAny) => ({
  validator: async (_: unknown, value: unknown) => {
    if (value === undefined || value === '') return
    const result = schema.safeParse(value)
    if (result.success) return
    throw new Error(result.error.issues[0]?.message ?? m.validationInvalidValue())
  },
})

const makeZodRule = (schema: z.ZodTypeAny) => ({
  validator: async (_: unknown, value: unknown) => {
    const result = schema.safeParse(value ?? '')
    if (result.success) return
    throw new Error(result.error.issues[0]?.message ?? m.validationInvalidValue())
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
    { label: m.clientSecretsExpirationOneDay(), value: '1d' },
    { label: m.clientSecretsExpirationOneWeek(), value: '1w' },
    { label: m.clientSecretsExpirationOneMonth(), value: '1m' },
    { label: m.clientSecretsExpirationThreeMonths(), value: '3m' },
    { label: m.clientSecretsExpirationNineMonths(), value: '9m' },
    { label: m.clientSecretsExpirationOneYear(), value: '1y' },
    { label: m.clientSecretsExpirationTwoYears(), value: '2y' },
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
      title={mode === 'create' ? m.clientSecretsGenerate() : m.clientSecretsEdit()}
      destroyOnClose
      forceRender
      onClose={onClose}
    >
      <Form layout="vertical" form={form} onFinish={onSubmit} autoComplete="off">
        <Form.Item
          label={m.clientSecretsPasswordHint()}
          name="passwordHint"
          rules={[makeOptionalZodRule(hintSchema)]}
        >
          <Input placeholder={m.clientSecretsOptionalHint()} />
        </Form.Item>
        {mode === 'create' ? (
          <Form.Item
            label={m.clientSecretsExpirationPeriod()}
            name="expirationPeriod"
            required
            rules={[makeZodRule(expirationSchema)]}
          >
            <Select
              placeholder={m.clientSecretsSelectExpirationPeriod()}
              options={expirationOptions}
            />
          </Form.Item>
        ) : null}
        <Form.Item>
          <Space>
            <Button onClick={onClose}>{m.mainCancel()}</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {mode === 'create' ? m.clientSecretsGenerate() : m.mainSaveChanges()}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Drawer>
  )
}
