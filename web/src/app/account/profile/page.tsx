import Information from 'components/dashboard/main/account/settings/Information';
import Connect from 'components/dashboard/main/account/settings/Connected';
import Delete from 'components/dashboard/main/account/settings/Delete';
import NewsLetter from 'components/dashboard/main/account/settings/Newsletter';
import Password from 'components/dashboard/main/account/settings/Password';
import Profile from 'components/dashboard/main/account/settings/Profile';
import Session from 'components/dashboard/main/account/settings/Sessions';
import Social from 'components/dashboard/main/account/settings/Socials';
import TwoFactor from 'components/dashboard/main/account/settings/TwoFactor';
import PaymentMethod from 'components/dashboard/main/account/billing/PaymentMethod';

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
