import { useEffect } from 'react'
import { Button, Drawer, Form, Input, Space } from 'antd'
import { z } from 'zod'
import { m } from '../../paraglide/messages'

export type GroupFormValues = {
  name: string
}

type GroupFormMode = 'create' | 'edit'

type GroupFormDrawerProps = {
  open: boolean
  mode: GroupFormMode
  initialValues?: Partial<GroupFormValues>
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (values: GroupFormValues) => void | Promise<void>
}

const nameSchema = z
  .string()
  .min(1, m.validationNameRequired())
  .max(100, m.validationNameMaxLength())

const makeZodRule = (schema: z.ZodTypeAny) => ({
  validator: async (_: unknown, value: unknown) => {
    const result = schema.safeParse(value ?? '')
    if (result.success) return
    throw new Error(result.error.issues[0]?.message ?? m.validationInvalidValue())
  },
})

export const GroupFormDrawer = ({
  open,
  mode,
  initialValues,
  isSubmitting = false,
  onClose,
  onSubmit,
}: GroupFormDrawerProps) => {
  const [form] = Form.useForm<GroupFormValues>()

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
      title={mode === 'create' ? m.groupsCreate() : m.groupsEdit()}
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
        <Form.Item label={m.mainName()} name="name" required rules={[makeZodRule(nameSchema)]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button onClick={onClose}>{m.mainCancel()}</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {mode === 'create' ? m.groupsCreate() : m.mainSaveChanges()}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Drawer>
  )
}
