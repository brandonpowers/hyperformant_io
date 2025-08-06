import Information from 'components/admin/main/account/settings/Information';
import Connect from 'components/admin/main/account/settings/Connected';
import Delete from 'components/admin/main/account/settings/Delete';
import NewsLetter from 'components/admin/main/account/settings/Newsletter';
import Password from 'components/admin/main/account/settings/Password';
import Profile from 'components/admin/main/account/settings/Profile';
import Session from 'components/admin/main/account/settings/Sessions';
import Social from 'components/admin/main/account/settings/Socials';
import TwoFactor from 'components/admin/main/account/settings/TwoFactor';
import PaymentMethod from 'components/admin/main/account/billing/PaymentMethod';

const AccountProfile = () => {
  return (
    <div className="mt-3 flex h-full w-full justify-center rounded-[20px]">
      <div className="flex w-1/2 flex-col gap-5">
        <Profile />
        <Information />
        <PaymentMethod />
        <Social />
        <Password />
        <TwoFactor />
        <NewsLetter />
        <Session />
        <Connect />
        <Delete />
      </div>
    </div>
  );
};

export default AccountProfile;