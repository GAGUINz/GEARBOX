import { CarPlatform } from "@/components/ui/car-platform";
import { createClient } from "@/utils/supabase/server";
import { getAvailableTimes } from "@/app/dashboard/actions";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  const supabase = await createClient();
  let profile = null;
  let myAppointments: any[] = [];
  let cmsData: { services: any[], gallery: any[], studio: any, testimonials: any[] } = { services: [], gallery: [], studio: null, testimonials: [] };

  let availableTimes = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      profile = data;

      const { data: apps } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', user.id)
        .neq('service_name', 'AVAILABLE_TIMES')
        .neq('service_name', 'Bloqueio de Agenda')
        .order('created_at', { ascending: false });
      if (apps) myAppointments = apps;
    }

    // Fetch CMS Data
    const { data: siteServices } = await supabase.from('site_services').select('*').order('created_at', { ascending: true });
    const { data: siteGallery } = await supabase.from('site_gallery').select('*').order('created_at', { ascending: false });
    const { data: siteStudioArray } = await supabase.from('site_studio').select('*').limit(1);
    const siteStudio = siteStudioArray?.[0] || null;
    const { data: siteTestimonials } = await supabase.from('site_testimonials').select('*').order('created_at', { ascending: false });

    cmsData = {
      services: siteServices || [],
      gallery: siteGallery || [],
      studio: siteStudio,
      testimonials: siteTestimonials || []
    };

    availableTimes = await getAvailableTimes();
  } catch (error) {
    console.error("Database connection error, using fallback data", error);
    // Continue with default empty data which will trigger the hardcoded fallback UI
  }

  return (
    <main className="min-h-screen">
      <CarPlatform userProfile={profile} cmsData={cmsData} availableTimes={availableTimes} myAppointments={myAppointments} />
    </main>
  );
}
