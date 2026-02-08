import { notification } from 'antd'

type ErrorNotificationOptions = {
  title?: string
}

export const showErrorNotification = (
  description: string,
  options: ErrorNotificationOptions = {},
) => {
  const { title = 'Unable to save' } = options

  notification.error({
    message: <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>,
    description: <span style={{ fontSize: 16 }}>{description}</span>,
    duration: 0,
    placement: 'top',
  })
}
