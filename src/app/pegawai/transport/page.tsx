import TransportCalendar from "@/components/pegawai/TransportCalendar";

export default function TransportPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Transport Calendar</h1>
        <p className="text-gray-600">
          Allocate your transport allowances to specific dates
        </p>
      </div>
      
      <TransportCalendar />
    </div>
  );
}
