import { Button, Result } from 'antd'
import { BFF_LOGIN_URL } from '../auth/urls'

const LogoutSuccessPage = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Result
      status="success"
      title="You logged out successfully"
      subTitle="To sign in again, click the button below."
      extra={[
        <Button
          key="login"
          type="primary"
          onClick={() => window.location.assign(BFF_LOGIN_URL)}
        >
          Sign in again
        </Button>,
      ]}
    />
  </div>
)

export default LogoutSuccessPage
