import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Descriptions, Form, Input, notification, Result, Space, Spin, Switch, Tag, Typography } from 'antd'
import { z } from 'zod'
import { useUser } from '../hooks/useUser'
import { updateProfile, type UpdateProfilePayload } from '../api/users/updateProfile'
import { currentUserQueryKey } from '../api/users/fetchCurrentUser'
import { sessionQueryKey } from '../api/users/fetchSession'
import { showErrorNotification } from '../ui/notifications'

type ProfileFormValues = UpdateProfilePayload & {
  password: string
  passwordConfirm: string
}

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

const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .max(50, 'Password must be 50 characters or less')

const makeZodRule = (schema: z.ZodTypeAny) => ({
  validator: async (_: unknown, value: unknown) => {
    const result = schema.safeParse(value ?? '')
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

const formatGrantType = (grantType: string) =>
  grantType
    .split('_')
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ')

const renderValue = (value: string | undefined) =>
  value?.trim() ? value : <Typography.Text type="secondary">-</Typography.Text>

const ProfilePage = () => {
  const queryClient = useQueryClient()
  const [form] = Form.useForm<ProfileFormValues>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { session, user, groups, displayName, isLoading, isAdmin } = useUser()
  const isSystem = user?.isSystem;

  const fullName =
    displayName ??
    (user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '')

  useEffect(() => {
    if (!user && !session) return

    form.setFieldsValue({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? session?.email ?? '',
      password: '',
      passwordConfirm: '',
      twoFaEnabled: Boolean(user?.twoFaEnabled),
    })
  }, [form, session, user])

  const handleSubmit = async (values: ProfileFormValues) => {
    if (isSystem) return

    setIsSubmitting(true)

    try {
      await updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        twoFaEnabled: values.twoFaEnabled,
        password: values.password || undefined,
      })

      form.setFieldsValue({ password: '', passwordConfirm: '' })
      await queryClient.invalidateQueries({ queryKey: currentUserQueryKey(session?.id) })
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey() })
      notification.success({
        message: 'Profile updated',
        description: 'Your profile changes were saved.',
        placement: 'top',
      })
    } catch (error) {
      showErrorNotification(
        error instanceof Error ? error.message : 'Unable to update profile',
        { title: 'Unable to update profile' },
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>Profile</Typography.Title>
        <Space><Spin /> <Typography.Text>Loading profile...</Typography.Text></Space>
      </Space>
    )
  }

  if (!session?.access_token_present) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>Profile</Typography.Title>
        <Result
          status="warning"
          title="No active session"
          subTitle="Sign in to view your profile information."
        />
      </Space>
    )
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            {fullName || user?.username || 'Profile'}
          </Typography.Title>
          <Typography.Text type="secondary">
            {user?.email ?? session.email ?? user?.username ?? session.id}
          </Typography.Text>
        </div>
      </div>

      <Descriptions
        bordered
        column={{ xs: 1, sm: 1, md: 2 }}
        title="Account"
      >
        <Descriptions.Item label="User ID">{renderValue(user?.id ?? session.id)}</Descriptions.Item>
        <Descriptions.Item label="Username">{renderValue(user?.username)}</Descriptions.Item>
        <Descriptions.Item label="Role">
          <Space>
            {isAdmin && <Tag color="blue">Administrator</Tag>}
            {isSystem ? <Tag color="purple">System User</Tag> : <Tag>Standard user</Tag>}
          </Space>
        </Descriptions.Item>
      </Descriptions>

      <Form
        layout="vertical"
        form={form}
        onFinish={handleSubmit}
        autoComplete="off"
        style={{ maxWidth: 640 }}
        disabled={isSystem}
      >
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          Profile details
        </Typography.Title>
        <Form.Item label="First name" name="firstName" required={!isSystem} rules={isSystem ? [] : [makeZodRule(firstNameSchema)]}>
          <Input />
        </Form.Item>
        <Form.Item label="Last name" name="lastName" required={!isSystem} rules={isSystem ? [] : [makeZodRule(lastNameSchema)]}>
          <Input />
        </Form.Item>
        <Form.Item label="Email" name="email" required={!isSystem} rules={isSystem ? [] : [makeZodRule(emailSchema)]}>
          <Input type="email" autoComplete="email" />
        </Form.Item>

        {!isSystem && (
          <>
            <Form.Item
              label="New password"
              name="password"
              rules={[makeOptionalZodRule(passwordSchema)]}
              extra="Leave blank to keep your current password."
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              label="Confirm new password"
              name="passwordConfirm"
              dependencies={['password']}
              rules={[
                ({ getFieldValue }) => ({
                  validator: async (_: unknown, value: unknown) => {
                    const password = getFieldValue('password')
                    if (!password && !value) return
                    if (!password) throw new Error('Enter a new password before confirming it')
                    if (!value) throw new Error('Confirm your new password')
                    if (value !== password) throw new Error('Passwords do not match')
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </>
        )}

        <Form.Item label="Two-factor authentication" name="twoFaEnabled" valuePropName="checked">
          <Switch />
        </Form.Item>

        {!isSystem && (
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              Save changes
            </Button>
          </Form.Item>
        )}
      </Form>

      <Descriptions
        bordered
        column={1}
        title="Access"
      >
        <Descriptions.Item label="Groups">
          {groups.length > 0 ? (
            <Space wrap size={[4, 4]}>
              {groups.map((group) => (
                <Tag color="blue" key={group.id}>
                  {group.name}
                </Tag>
              ))}
            </Space>
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Grant types">
          {user?.grantTypes?.length ? (
            <Space wrap size={[4, 4]}>
              {user.grantTypes.map((grantType) => (
                <Tag key={grantType}>{formatGrantType(grantType)}</Tag>
              ))}
            </Space>
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Space>
  )
}

export default ProfilePage
