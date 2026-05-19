import { Icon } from "@iconify/react";

export interface SummaryCardsProps {
  data: SummaryCardItem[];
}
export interface SummaryCardItem {
  label: string;
  value: string;
  icon: string;
  color: string;
}

export default function SummaryCards({ data = [] }: SummaryCardsProps) {
  if (!data?.length) return null;

  return (
    <div
      className={`mt-4 grid grid-cols-1 sm:grid-cols-2 ${data.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"
        } gap-4`}
    >
      {data?.map((item, index) => (
        <div
          key={index}
          className="bg-white p-4 sm:p-5 lg:p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
        >
          <p className="text-xs sm:text-sm  text-gray-500 mb-3 sm:mb-4">
            {item.label}
          </p>

          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-600 break-words">
              {item.value}
            </p>

            <div className="bg-primary-100 p-2 sm:p-3 rounded-full shrink-0">
              <Icon
                icon={item.icon}
                className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


export function SummaryCardSkeleton() {
  return (
    <div className="grid lg:grid-cols-4  grid-cols-1 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="flex justify-between items-end">
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-9 w-9 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}