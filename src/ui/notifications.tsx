import { notification } from 'antd'
import { m } from '../paraglide/messages'

type ErrorNotificationOptions = {
  title?: string
}

export const showErrorNotification = (
  description: string,
  options: ErrorNotificationOptions = {},
) => {
  const { title = m.mainUnableToSave() } = options

  notification.error({
    message: <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>,
    description: <span style={{ fontSize: 16 }}>{description}</span>,
    duration: 0,
    placement: 'top',
  })
}
