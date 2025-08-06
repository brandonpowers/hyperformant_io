// Assets
import Card from 'components/ui/card';
import MasterCardIcon from 'components/ui/icons/MasterCardIcon';
import VisaIcon from 'components/ui/icons/visaIcon';
import { MdEdit } from 'react-icons/md';

const PaymentMethod = () => {
  return (
    <Card extra={'w-full px-8 py-8'}>
      <h4 className="ml-1 mt-3 font-dm text-lg font-bold text-navy-700 dark:text-white">
        Payment Methods
      </h4>

      {/* MasterCard */}
      <div className="mt-[28px] flex items-center justify-between rounded-xl border border-gray-200 px-4 py-[21px] dark:!border-white/10">
        <div className="flex items-center justify-center gap-2">
          <h3>
            <MasterCardIcon />
          </h3>
          <h4 className="font-dm text-gray-700 dark:text-white">
            7812 2139 0823 XXXX
          </h4>
        </div>

        <div className="text-base text-gray-700 hover:cursor-pointer dark:text-white">
          <MdEdit className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-[22px] flex items-center justify-between rounded-xl border border-gray-200 px-4 py-[20px] dark:!border-white/10">
        <div className="flex items-center justify-center gap-2 text-brand-500 dark:text-white">
          <h6>
            <VisaIcon />
          </h6>
          <h6 className="font-dm text-gray-700 dark:text-white">
            7812 2139 0823 XXXX
          </h6>
        </div>

        <div className="text-base text-gray-700 hover:cursor-pointer">
          <MdEdit className="h-5 w-5" />
        </div>
      </div>

      {/* Add Button */}
      <div className="mt-12 flex w-full justify-end">
        <button className="linear rounded-xl bg-brand-500 px-4 py-2 text-base font-medium text-white transition duration-200 hover:cursor-pointer hover:bg-brand-600 active:bg-brand-700 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-300 dark:active:bg-brand-200">
          Add
        </button>
      </div>
    </Card>
  );
};

export default PaymentMethod;
