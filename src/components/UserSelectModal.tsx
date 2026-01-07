import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';
import { X } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserSelectModalProps {
  workspaceId: string;
  currentUserId: string;
  onSelect: (userId: string) => void;
  onClose: () => void;
}

export default function UserSelectModal({ workspaceId, currentUserId, onSelect, onClose }: UserSelectModalProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      // Fetch members of the workspace
      const { data, error } = await supabase
        .from('members')
        .select('user_id, profiles(*)')
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        // Filter out current user and map to profiles
        const profiles = data
          .map((m: { profiles: Profile | null }) => m.profiles)
          .filter((p: Profile | null): p is Profile => p !== null && p.id !== currentUserId);
        setUsers(profiles);
      }
      setLoading(false);
    }

    fetchUsers();
  }, [workspaceId, currentUserId]);

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">New Message</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <input
            type="text"
            placeholder="Search people..."
            className="w-full px-3 py-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          
          <div className="h-64 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center text-gray-500">Loading...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center text-gray-500">No users found</div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onSelect(user.id)}
                  className="flex items-center w-full p-2 text-left rounded-md hover:bg-gray-100"
                >
                  <div className="flex items-center justify-center w-8 h-8 mr-3 text-sm font-bold text-white bg-blue-500 rounded-full">
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {user.username || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.full_name || ''}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

