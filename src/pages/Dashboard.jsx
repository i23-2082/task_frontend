import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Menu, X, Plus, Search, Edit, Trash2, UserPlus, Trash } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000'; // Use proxy path for Vite

const Dashboard = () => {
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskForm, setTaskForm] = useState({
    id: null,
    title: '',
    description: '',
    assigned_to_id: '',
    assigned_by_id: '',
    team_id: '',
    due_date: '',
    status: 'To Do',
  });
  const [teamForm, setTeamForm] = useState({ name: '' });
  const [addMemberForm, setAddMemberForm] = useState({ userId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const navigate = useNavigate();

  // Mock logged-in user (replace with actual auth logic)
  const loggedInUserId = 4; // Example: User ID 4 (john_doe)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log(`Fetching data from ${API_BASE_URL}`);

        // Fetch teams
        const teamsResponse = await axios.get(`${API_BASE_URL}/teams`, {
          withCredentials: true,
        });
        console.log('Teams response:', teamsResponse);

        if (!teamsResponse.headers['content-type']?.includes('application/json')) {
          throw new Error('Invalid response format from server');
        }
        if (!Array.isArray(teamsResponse.data)) {
          throw new Error('Invalid teams data format');
        }

        const teamsData = teamsResponse.data;
        const enrichedTeams = await Promise.all(
          teamsData.map(async (team) => {
            const membersResponse = await axios.get(`${API_BASE_URL}/teams/${team.id}/members`, {
              withCredentials: true,
            });
            return { ...team, members: membersResponse.data || [] };
          })
        );
        setTeams(enrichedTeams);

        // Fetch tasks
        const tasksResponse = await axios.get(`${API_BASE_URL}/tasks/get-task`, {
          withCredentials: true,
        });
        setTasks(tasksResponse.data || []);
        setFilteredTasks(tasksResponse.data || []);

        // Fetch users
        try {
          const usersResponse = await axios.get(`${API_BASE_URL}/users`, {
            withCredentials: true,
          });
          setUsers(usersResponse.data || []);
        } catch (usersError) {
          console.warn('Failed to fetch users:', usersError);
          setUsers([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error.response?.data || error.message);
        if (error.response?.status === 401) {
          navigate('/login');
        }
        setError(error.response?.data?.error || error.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  useEffect(() => {
    let filtered = tasks;
    if (selectedTeam) {
      filtered = filtered.filter((task) => task.team_id === parseInt(selectedTeam, 10));
    }
    if (selectedAssignee) {
      filtered = filtered.filter((task) => task.assigned_to_id === parseInt(selectedAssignee, 10));
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (task) =>
          task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredTasks(filtered);
  }, [selectedTeam, selectedAssignee, searchQuery, tasks]);

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (!taskForm.title) {
        setError('Title is required');
        return;
      }
      if (!taskForm.team_id) {
        setError('Team is required');
        return;
      }
      const sanitizedTaskForm = {
        title: taskForm.title,
        description: taskForm.description || null,
        team_id: parseInt(taskForm.team_id, 10),
        due_date: taskForm.due_date || null,
        status: taskForm.status || 'To Do',
      };
      if (taskForm.assigned_to_id) {
        sanitizedTaskForm.assigned_to_id = parseInt(taskForm.assigned_to_id, 10);
      }
      // assigned_by_id is set on the backend to req.user.id, so we don't need to send it
      console.log('Saving task with data:', sanitizedTaskForm);

      const url = taskForm.id
        ? `${API_BASE_URL}/tasks/${taskForm.id}`
        : `${API_BASE_URL}/tasks/create-task`;
      console.log('Request URL:', url);
      const method = taskForm.id ? 'put' : 'post';

      const response = await axios[method](url, sanitizedTaskForm, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });

      const updatedTask = response.data;
      console.log('Task response:', updatedTask);
      if (taskForm.id) {
        setTasks(tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
        setFilteredTasks(filteredTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
      } else {
        setTasks([...tasks, updatedTask]);
        setFilteredTasks([...filteredTasks, updatedTask]);
      }

      setIsModalOpen(false);
      setTaskForm({
        id: null,
        title: '',
        description: '',
        assigned_to_id: '',
        assigned_by_id: loggedInUserId.toString(),
        team_id: '',
        due_date: '',
        status: 'To Do',
      });
    } catch (error) {
      const errorMessage = error.response?.data?.errors?.map((e) => e.msg).join(', ') ||
                          error.response?.data?.error || `Failed to save task: ${error.message}`;
      console.error('Error saving task:', {
        message: error.message,
        response: error.response?.data,
        url,
        task: sanitizedTaskForm,
      });
      setError(errorMessage);
    }
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post(`${API_BASE_URL}/teams`, teamForm, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      });

      const newTeam = response.data;
      const membersResponse = await axios.get(`${API_BASE_URL}/teams/${newTeam.id}/members`, {
        withCredentials: true,
      });
      setTeams([...teams, { ...newTeam, members: membersResponse.data || [] }]);

      setIsTeamModalOpen(false);
      setTeamForm({ name: '' });
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create team');
    }
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post(
        `${API_BASE_URL}/teams/${selectedTeamForMembers.id}/members`,
        { userId: parseInt(addMemberForm.userId, 10) },
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );

      const membersResponse = await axios.get(
        `${API_BASE_URL}/teams/${selectedTeamForMembers.id}/members`,
        { withCredentials: true }
      );
      setTeams(
        teams.map((team) =>
          team.id === selectedTeamForMembers.id ? { ...team, members: membersResponse.data || [] } : team
        )
      );

      setIsAddMemberModalOpen(false);
      setAddMemberForm({ userId: '' });
      setSelectedTeamForMembers(null);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to add member');
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;
    setError('');
    try {
      await axios.delete(`${API_BASE_URL}/teams/${teamId}`, { withCredentials: true });
      setTeams(teams.filter((team) => team.id !== teamId));
      if (selectedTeam === teamId) {
        setSelectedTeam('');
        setSelectedAssignee('');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete team');
    }
  };

  const handleEditTask = (task) => {
    setTaskForm({
      id: task.id,
      title: task.title || '',
      description: task.description || '',
      assigned_to_id: task.assigned_to_id ? task.assigned_to_id.toString() : '',
      assigned_by_id: task.assigned_by_id ? task.assigned_by_id.toString() : loggedInUserId.toString(),
      team_id: task.team_id ? task.team_id.toString() : '',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      status: task.status || 'To Do',
    });
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    setError('');
    try {
      await axios.delete(`${API_BASE_URL}/tasks/${taskId}`, { withCredentials: true });
      setTasks(tasks.filter((task) => task.id !== taskId));
      setFilteredTasks(filteredTasks.filter((task) => task.id !== taskId));
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete task');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });
      navigate('/login');
    } catch (error) {
      navigate('/login');
    }
  };

  const allAssignees = Array.from(
    new Map(
      teams
        .flatMap((team) => team.members || [])
        .map((member) => [member.id, member])
    ).values()
  );

  const getAssigneeName = (task, field = 'assigned_to_id') => {
    const userId = task[field];
    if (!userId) return 'Unassigned';
    const user = users.find((u) => u.id === userId);
    return user?.username || 'Unknown';
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-200">
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-gray-800 p-4 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-30 overflow-y-auto`}
      >
        <button className="md:hidden mb-4" onClick={() => setIsSidebarOpen(false)}>
          <X className="w-6 h-6 text-gray-300" />
        </button>
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
            TM
          </div>
          <span className="ml-2 text-lg font-semibold">Task Flow</span>
        </div>
        <nav className="space-y-2">
          <h3 className="text-xs font-medium text-gray-400 mb-2">Teams</h3>
          <ul className="space-y-1">
            {teams.map((team) => (
              <li key={team.id} className="rounded hover:bg-gray-700">
                <button
                  onClick={() => {
                    setSelectedTeam(team.id.toString());
                    setSelectedAssignee('');
                    setIsSidebarOpen(false);
                  }}
                  className={`text-left w-full py-2 px-3 text-sm ${
                    selectedTeam === team.id.toString() ? 'font-semibold text-blue-400' : 'text-gray-300'
                  }`}
                >
                  {team.name}
                  <span className="text-xs text-gray-500 block">
                    {(team.members || []).length} members
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1">
            <button
              onClick={() => {
                setSelectedTeam('');
                setSelectedAssignee('');
                setIsSidebarOpen(false);
              }}
              className="block w-full text-left py-2 px-3 text-gray-300 text-sm hover:bg-gray-700 rounded"
            >
              All Teams
            </button>
            <button
              onClick={handleLogout}
              className="block w-full text-left py-2 px-3 text-red-400 text-sm hover:bg-red-900 rounded"
            >
              Logout
            </button>
          </div>
        </nav>
      </aside>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 bg-gray-800 shadow p-4 z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center justify-between sm:flex-1 sm:mr-4">
              <button className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
                <Menu className="w-6 h-6 text-gray-300" />
              </button>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-700 bg-gray-700 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedTeam}
                onChange={(e) => {
                  setSelectedTeam(e.target.value);
                  setSelectedAssignee('');
                }}
                className="w-full sm:w-40 p-2 rounded-lg border border-gray-700 bg-gray-700 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="w-full sm:w-40 p-2 rounded-lg border border-gray-700 bg-gray-700 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Assignees</option>
                {(selectedTeam
                  ? teams.find((t) => t.id === parseInt(selectedTeam, 10))?.members || []
                  : allAssignees
                ).map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.username}
                  </option>
                ))}
              </select>
              <button
                className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors text-sm"
                onClick={() => {
                  setTaskForm({
                    id: null,
                    title: '',
                    description: '',
                    assigned_to_id: '',
                    assigned_by_id: loggedInUserId.toString(),
                    team_id: '',
                    due_date: '',
                    status: 'To Do',
                  });
                  setIsModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> New Task
              </button>
              <button
                className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors text-sm"
                onClick={() => {
                  setTeamForm({ name: '' });
                  setIsTeamModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> New Team
              </button>
              <button
                onClick={() => setShowAllTeams(true)}
                className="w-full sm:w-auto bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors text-sm"
              >
                Show All Teams
              </button>
              <button
                onClick={() => setShowAllTasks(true)}
                className="w-full sm:w-auto bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors text-sm"
              >
                Show All Tasks
              </button>
              <button
                onClick={() => {
                  console.log('All Teams:', teams);
                  console.log('All Tasks:', tasks);
                }}
                className="w-full sm:w-auto bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors text-sm"
              >
                Log Teams & Tasks
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 flex-1 overflow-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-900 border-l-4 border-red-500 rounded-r-lg text-red-200 text-sm">
              {error}
              <button onClick={() => setError('')} className="ml-2 text-red-200 hover:text-red-100">
                Dismiss
              </button>
            </div>
          )}
          {loading && <div className="text-center text-gray-400 text-sm">Loading...</div>}
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-200 mb-4">Teams</h2>
            {teams.length === 0 && !loading ? (
              <div className="text-center text-gray-400 text-sm">No teams found. Create a team to get started.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedTeam(team.id.toString());
                        setSelectedAssignee('');
                        setIsSidebarOpen(false);
                      }}
                    >
                      <h3 className="text-base sm:text-lg font-semibold text-gray-200 mb-2">{team.name}</h3>
                      <p className="text-gray-400 text-sm">
                        <span className="font-medium">{team.members?.length || 0}</span> members
                      </p>
                      <div className="mt-2 flex -space-x-2">
                        {(team.members || []).slice(0, 3).map((member, index) => (
                          <div
                            key={index}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs sm:text-sm font-medium border-2 border-gray-800"
                          >
                            {member.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                        ))}
                        {team.members?.length > 3 && (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-medium border-2 border-gray-800">
                            +{(team.members.length - 3)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedTeamForMembers(team);
                          setAddMemberForm({ userId: '' });
                          setIsAddMemberModalOpen(true);
                        }}
                        className="w-full bg-indigo-600 text-white px-3 py-1 rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-colors text-sm"
                      >
                        <UserPlus className="w-4 h-4 mr-1" /> Add Member
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="w-full bg-red-600 text-white px-3 py-1 rounded-lg flex items-center justify-center hover:bg-red-700 transition-colors text-sm"
                      >
                        <Trash className="w-4 h-4 mr-1" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showAllTeams && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">All Teams in Database</h3>
                {teams.length === 0 ? (
                  <div className="text-gray-400 text-sm">No teams available in the database.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teams.map((team) => (
                      <div key={team.id} className="bg-gray-700 p-4 rounded-lg shadow">
                        <h4 className="text-base font-medium text-gray-200">{team.name}</h4>
                        <p className="text-gray-400 text-sm">
                          Members: {team.members?.length || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowAllTeams(false)}
                  className="mt-4 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                >
                  Hide All Teams
                </button>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-200 mb-4">
              Tasks {selectedTeam && `- ${teams.find((t) => t.id === parseInt(selectedTeam, 10))?.name}`}
            </h2>
            <div className="hidden sm:block">
              <div className="bg-gray-800 rounded-lg shadow overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Task
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Assigned To
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Assigned By
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {filteredTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-700">
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-gray-200">{task.title}</div>
                            <div className="text-xs text-gray-400">{task.description}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
                            {teams.find((t) => t.id === task.team_id)?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-200">
                          {getAssigneeName(task, 'assigned_to_id')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-200">
                          {getAssigneeName(task, 'assigned_by_id')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-200">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              task.status === 'Done'
                                ? 'bg-green-900 text-green-200'
                                : task.status === 'In Progress'
                                ? 'bg-yellow-900 text-yellow-200'
                                : 'bg-red-900 text-red-200'
                            }`}
                          >
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <button
                            onClick={() => handleEditTask(task)}
                            className="text-blue-400 hover:text-blue-300 mr-3"
                          >
                            <Edit className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="sm:hidden space-y-4">
              {filteredTasks.map((task) => (
                <div key={task.id} className="bg-gray-800 p-4 rounded-lg shadow">
                  <h3 className="text-base font-semibold text-gray-200 mb-2">{task.title}</h3>
                  <p className="text-gray-400 text-sm mb-3">{task.description}</p>
                  <div className="flex flex-col gap-2 mb-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200 w-fit">
                      {teams.find((t) => t.id === task.team_id)?.name || 'N/A'}
                    </span>
                    <span className="text-sm text-gray-400">
                      Assigned To: {getAssigneeName(task, 'assigned_to_id')}
                    </span>
                    <span className="text-sm text-gray-400">
                      Assigned By: {getAssigneeName(task, 'assigned_by_id')}
                    </span>
                    <span className="text-sm text-gray-400">
                      Due Date: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                    </span>
                    <span className="text-sm text-gray-400">
                      Status:{' '}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          task.status === 'Done'
                            ? 'bg-green-900 text-green-200'
                            : task.status === 'In Progress'
                            ? 'bg-yellow-900 text-yellow-200'
                            : 'bg-red-900 text-red-200'
                        }`}
                      >
                        {task.status}
                      </span>
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditTask(task)}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      <Edit className="w-4 h-4 inline mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-400 hover:text-red-300 text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {filteredTasks.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-base sm:text-lg">No tasks found</div>
                <p className="text-gray-500 mt-2 text-sm">
                  {searchQuery || selectedTeam || selectedAssignee
                    ? 'Try adjusting your filters'
                    : 'Create your first task to get started'}
                </p>
              </div>
            )}
            {showAllTasks && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">All Tasks in Database</h3>
                <div className="bg-gray-800 rounded-lg shadow overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Task
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Team
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Assigned To
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Assigned By
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {tasks.map((task) => (
                        <tr key={task.id} className="hover:bg-gray-700">
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-sm font-medium text-gray-200">{task.title}</div>
                              <div className="text-xs text-gray-400">{task.description}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
                              {teams.find((t) => t.id === task.team_id)?.name || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-200">
                            {getAssigneeName(task, 'assigned_to_id')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-200">
                            {getAssigneeName(task, 'assigned_by_id')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-200">
                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                task.status === 'Done'
                                  ? 'bg-green-900 text-green-200'
                                  : task.status === 'In Progress'
                                  ? 'bg-yellow-900 text-yellow-200'
                                  : 'bg-red-900 text-red-200'
                              }`}
                            >
                              {task.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={() => setShowAllTasks(false)}
                  className="mt-4 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                >
                  Hide All Tasks
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-200">
                {taskForm.id ? 'Edit Task' : 'Create Task'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-6 h-6 text-gray-300" />
              </button>
            </div>
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1 text-sm font-medium">Title</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1 text-sm font-medium">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1 text-sm font-medium">Team</label>
                <select
                  value={taskForm.team_id}
                  onChange={(e) => setTaskForm({ ...taskForm, team_id: e.target.value, assigned_to_id: '' })}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1 text-sm font-medium">Assigned To</label>
                <select
                  value={taskForm.assigned_to_id}
                  onChange={(e) => setTaskForm({ ...taskForm, assigned_to_id: e.target.value })}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!taskForm.team_id}
                >
                  <option value="">
                    {taskForm.team_id ? 'Select Assignee' : 'Please select a team first'}
                  </option>
                  {taskForm.team_id &&
                    teams
                      .find((t) => t.id === parseInt(taskForm.team_id, 10))
                      ?.members?.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.username}
                        </option>
                      ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1 text-sm font-medium">Assigned By</label>
                <select
                  value={taskForm.assigned_by_id}
                  onChange={(e) => setTaskForm({ ...taskForm, assigned_by_id: e.target.value })}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1 text-sm font-medium">Status</label>
                <select
                  value={taskForm.status}
                  onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1 text-sm font-medium">Due Date</label>
                <input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                >
                  {taskForm.id ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-200">Create Team</h2>
              <button onClick={() => setIsTeamModalOpen(false)}>
                <X className="w-6 h-6 text-gray-300" />
              </button>
            </div>
            <form onSubmit={handleTeamSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1 text-sm font-medium">Team Name</label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ name: e.target.value })}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddMemberModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-200">
                Add Member to {selectedTeamForMembers?.name}
              </h2>
              <button onClick={() => setIsAddMemberModalOpen(false)}>
                <X className="w-6 h-6 text-gray-300" />
              </button>
            </div>
            <form onSubmit={handleAddMemberSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1 text-sm font-medium">Select User</label>
                <select
                  value={addMemberForm.userId}
                  onChange={(e) => setAddMemberForm({ userId: e.target.value })}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select User</option>
                  {users
                    .filter(
                      (user) =>
                        !(selectedTeamForMembers?.members || []).some((member) => member.id === user.id)
                    )
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;