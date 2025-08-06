import Card from 'components/ui/card';
import InputField from 'components/ui/fields/InputField';

const Information = () => {
  return (
    <Card extra={'w-full px-8 py-8'}>
      {/* Header */}
      <div className="w-full px-[8px]">
        <h4 className="text-xl font-bold text-navy-700 dark:text-white">
          Profile
        </h4>
        <p className="mt-1 text-base text-gray-600">
          Here you can change your profile information
        </p>
      </div>
      {/* Email Address - full width */}
      <InputField
        label="Email Address"
        placeholder="user@hyperformant.io"
        id="email"
        type="email"
        extra="mb-2 mt-7"
      />
      
      {/* Name fields - grid */}
      <div className="mb-2 grid grid-cols-2 gap-3">
        <InputField
          label="First Name"
          placeholder="Vlad"
          id="firstname"
          type="text"
        />
        <InputField
          label="Last Name"
          placeholder="Mihalache"
          id="lastname"
          type="text"
        />
      </div>
      
      {/* Job - full width */}
      <InputField
        label="Job"
        placeholder="CTO"
        id="job"
        type="text"
        extra="mb-2"
      />
    </Card>
  );
};

export default Information;
