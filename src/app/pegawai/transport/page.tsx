import TransportCalendar from "@/components/pegawai/TransportCalendar";

export default function TransportPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Kalender Transport
        </h1>
        <p className="text-gray-600">
          Alokasikan tunjangan transport Anda ke tanggal tertentu
        </p>
      </div>

      <TransportCalendar />
    </div>
  );
}
