import React from 'react';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => {
  return (
    <div className="bg-white p-4 sm:p-6 md:p-8 sm:rounded-xl sm:shadow-md border-b sm:border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-4 mb-6">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {children}
      </div>
    </div>
  );
};

export default Section;