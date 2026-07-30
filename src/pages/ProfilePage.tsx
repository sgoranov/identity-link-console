import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Descriptions, Form, Input, notification, Result, Space, Spin, Switch, Tag, Typography } from 'antd'
import { z } from 'zod'
import { useUser } from '../hooks/useUser'
import { updateProfile, type UpdateProfilePayload } from '../api/users/updateProfile'
import { currentUserQueryKey } from '../api/users/fetchCurrentUser'
import { sessionQueryKey } from '../api/users/fetchSession'
import { showErrorNotification } from '../ui/notifications'
import { m } from '../paraglide/messages'

type ProfileFormValues = UpdateProfilePayload & {
  password: string
  passwordConfirm: string
}

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

const passwordSchema = z
  .string()
  .min(1, m.validationPasswordRequired())
  .max(50, m.validationPasswordMaxLength())

const makeZodRule = (schema: z.ZodTypeAny) => ({
  validator: async (_: unknown, value: unknown) => {
    const result = schema.safeParse(value ?? '')
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
        message: m.profileUpdated(),
        description: m.profileChangesSaved(),
        placement: 'top',
      })
    } catch (error) {
      showErrorNotification(
        error instanceof Error ? error.message : m.profileUnableToUpdate(),
        { title: m.profileUnableToUpdate() },
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>{m.profileTitle()}</Typography.Title>
        <Space><Spin /> <Typography.Text>{m.profileLoading()}</Typography.Text></Space>
      </Space>
    )
  }

  if (!session?.access_token_present) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>{m.profileTitle()}</Typography.Title>
        <Result
          status="warning"
          title={m.profileNoActiveSession()}
          subTitle={m.profileSignInToView()}
        />
      </Space>
    )
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            {fullName || user?.username || m.profileTitle()}
          </Typography.Title>
          <Typography.Text type="secondary">
            {user?.email ?? session.email ?? user?.username ?? session.id}
          </Typography.Text>
        </div>
      </div>

      <Descriptions
        bordered
        column={{ xs: 1, sm: 1, md: 2 }}
        title={m.profileAccount()}
      >
        <Descriptions.Item label={m.profileUserId()}>{renderValue(user?.id ?? session.id)}</Descriptions.Item>
        <Descriptions.Item label={m.mainUsername()}>{renderValue(user?.username)}</Descriptions.Item>
        <Descriptions.Item label={m.profileRole()}>
          <Space>
            {isAdmin && <Tag color="blue">{m.profileAdministrator()}</Tag>}
            {isSystem ? <Tag color="purple">{m.profileSystemUser()}</Tag> : <Tag>{m.profileStandardUser()}</Tag>}
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
          {m.profileDetails()}
        </Typography.Title>
        <Form.Item label={m.mainFirstName()} name="firstName" required={!isSystem} rules={isSystem ? [] : [makeZodRule(firstNameSchema)]}>
          <Input />
        </Form.Item>
        <Form.Item label={m.mainLastName()} name="lastName" required={!isSystem} rules={isSystem ? [] : [makeZodRule(lastNameSchema)]}>
          <Input />
        </Form.Item>
        <Form.Item label={m.mainEmail()} name="email" required={!isSystem} rules={isSystem ? [] : [makeZodRule(emailSchema)]}>
          <Input type="email" autoComplete="email" />
        </Form.Item>

        {!isSystem && (
          <>
            <Form.Item
              label={m.profileNewPassword()}
              name="password"
              rules={[makeOptionalZodRule(passwordSchema)]}
              extra={m.profileLeaveBlankToKeepPassword()}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              label={m.profileConfirmNewPassword()}
              name="passwordConfirm"
              dependencies={['password']}
              rules={[
                ({ getFieldValue }) => ({
                  validator: async (_: unknown, value: unknown) => {
                    const password = getFieldValue('password')
                    if (!password && !value) return
                    if (!password) throw new Error(m.profileEnterNewPasswordBeforeConfirming())
                    if (!value) throw new Error(m.profileConfirmYourNewPassword())
                    if (value !== password) throw new Error(m.profilePasswordsDoNotMatch())
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </>
        )}

        <Form.Item label={m.mainTwoFactorAuthentication()} name="twoFaEnabled" valuePropName="checked">
          <Switch />
        </Form.Item>

        {!isSystem && (
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {m.mainSaveChanges()}
            </Button>
          </Form.Item>
        )}
      </Form>

      <Descriptions
        bordered
        column={1}
        title={m.profileAccess()}
      >
        <Descriptions.Item label={m.mainGroups()}>
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
        <Descriptions.Item label={m.mainGrantTypes()}>
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
