import { useEffect } from 'react'
import { Button, Drawer, Form, Input, Space } from 'antd'
import { z } from 'zod'

export type ClientGroupFormValues = {
  name: string
}

type ClientGroupFormMode = 'create' | 'edit'

type ClientGroupFormDrawerProps = {
  open: boolean
  mode: ClientGroupFormMode
  initialValues?: Partial<ClientGroupFormValues>
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (values: ClientGroupFormValues) => void | Promise<void>
}

const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be 100 characters or less')

const makeZodRule = (schema: z.ZodTypeAny) => ({
  validator: async (_: unknown, value: unknown) => {
    const result = schema.safeParse(value ?? '')
    if (result.success) return
    throw new Error(result.error.issues[0]?.message ?? 'Invalid value')
  },
})

export const ClientGroupFormDrawer = ({
  open,
  mode,
  initialValues,
  isSubmitting = false,
  onClose,
  onSubmit,
}: ClientGroupFormDrawerProps) => {
  const [form] = Form.useForm<ClientGroupFormValues>()

  useEffect(() => {
    if (!open) {
      form.resetFields()
      return
    }

    form.setFieldsValue({
      name: '',
      ...initialValues,
    })
  }, [form, initialValues, open])

  return (
    <Drawer
      open={open}
      width={420}
      title={mode === 'create' ? 'Create group' : 'Edit group'}
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
        <Form.Item label="Name" name="name" required rules={[makeZodRule(nameSchema)]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {mode === 'create' ? 'Create group' : 'Save changes'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Drawer>
  )
}
