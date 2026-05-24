'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Clock, Naira } from 'lucide-react'; // Naira is not in lucide, we'll use text

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const categories = ["Plumbing", "Electrical", "Carpentry", "Makeup & Hair", "Cleaning", 
                     "Painting", "Car Repair", "Tailoring", "AC Repair", "Photography"];

  const locations = ["Woji", "GRA Phase 1", "GRA Phase 2", "Diobu", "Trans Amadi", 
                    "Asari-Toru", "Elelenwo", "Rumuomasi", "Port Harcourt"];

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data);
    } catch (error) {
      console.error("Failed to fetch jobs", error);
    }
    setLoading(false);
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || job.category === selectedCategory;
    const matchesLocation = !selectedLocation || job.location === selectedLocation;

    return matchesSearch && matchesCategory && matchesLocation;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Available Jobs in Port Harcourt</h1>
        <Link
          href="/post-job"
          className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700"
        >
          Post a Job
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm mb-8">
        <div className="grid md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-3 rounded-xl border dark:bg-gray-800 dark:border-gray-700"
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 rounded-xl border dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-4 py-3 rounded-xl border dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="">All Locations</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          <button
            onClick={fetchJobs}
            className="bg-green-600 text-white rounded-xl hover:bg-green-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Jobs List */}
      {loading ? (
        <p className="text-center py-12">Loading jobs...</p>
      ) : filteredJobs.length === 0 ? (
        <p className="text-center py-12 text-gray-500">No jobs found matching your criteria.</p>
      ) : (
        <div className="grid gap-6">
          {filteredJobs.map(job => (
            <div key={job._id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                  <p className="text-green-600 font-medium">
                    ₦{job.budgetMin} - ₦{job.budgetMax}
                  </p>
                </div>
                <span className="text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-full">
                  {job.category}
                </span>
              </div>

              <p className="mt-3 text-gray-600 dark:text-gray-400 line-clamp-2">
                {job.description}
              </p>

              <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <MapPin size={16} />
                  {job.location}
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  {new Date(job.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <Link
                  href={`/jobs/${job._id}`}
                  className="flex-1 bg-green-600 text-white text-center py-3 rounded-xl hover:bg-green-700"
                >
                  View Details & Apply
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}