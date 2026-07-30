import { Button, Result } from 'antd'
import { BFF_LOGIN_URL } from '../auth/urls'
import { m } from '../paraglide/messages'

const LogoutSuccessPage = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Result
      status="success"
      title={m.logoutSuccessTitle()}
      subTitle={m.logoutSuccessSubtitle()}
      extra={[
        <Button
          key="login"
          type="primary"
          onClick={() => window.location.assign(BFF_LOGIN_URL)}
        >
          {m.logoutSignInAgain()}
        </Button>,
      ]}
    />
  </div>
)

export default LogoutSuccessPage
