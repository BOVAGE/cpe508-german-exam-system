import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../utils/api";
import {
  Building2,
  Layers,
  BookOpen,
  Users,
  FileSpreadsheet,
  UserPlus,
  Plus,
  Edit2,
  Trash2,
  Search,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  X,
  FileText,
  ChevronRight,
  ArrowLeftIcon,
} from "lucide-react";

const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "faculties"
    | "departments"
    | "courses"
    | "exams"
    | "lecturers"
    | "students"
    | "assignments"
  >("overview");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"create" | "edit" | "delete">(
    "create",
  );
  const [currentEntity, setCurrentEntity] = useState<string | null>(null); // e.g. 'faculty', 'department'
  const [editItem, setEditItem] = useState<any | null>(null);

  // Form states
  const [formData, setFormData] = useState<any>({});
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  // Course Navigation
  const [courseView, setCourseView] = useState<
    "departments" | "levels" | "semesters" | "courses"
  >("departments");

  const [selectedCourseDepartment, setSelectedCourseDepartment] = useState<
    any | null
  >(null);
  const [selectedCourseLevel, setSelectedCourseLevel] = useState<number | null>(
    null,
  );
  const [selectedCourseSemester, setSelectedCourseSemester] = useState<
    "Harmattan" | "Rain" | null
  >(null);

  // Queries for listing items
  const { data: faculties = [] } = useQuery({
    queryKey: ["faculties"],
    queryFn: async () => {
      const res = await api.get("/faculties");
      return res.data;
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await api.get("/departments");
      return res.data;
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await api.get("/courses");
      return res.data;
    },
  });

  const { data: exams = [] } = useQuery({
    queryKey: ["exams"],
    queryFn: async () => {
      const res = await api.get("/exams");
      return res.data;
    },
  });

  const { data: lecturers = [] } = useQuery({
    queryKey: ["users", "LECTURER"],
    queryFn: async () => {
      const res = await api.get("/users?role=LECTURER");
      return res.data;
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["users", "STUDENT"],
    queryFn: async () => {
      const res = await api.get("/users?role=STUDENT");
      return res.data;
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["course-assignments"],
    queryFn: async () => {
      const res = await api.get("/course-assignments");
      return res.data;
    },
  });

  // Mutate endpoints helper
  const createMutation = useMutation({
    mutationFn: async ({ path, data }: { path: string; data: any }) => {
      return api.post(path, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [variables.path.replace(/^\//, "")],
      });
      // Special invalidation rules for user profiles and course assign dependencies
      if (variables.path.includes("users")) {
        queryClient.invalidateQueries({ queryKey: ["users"] });
      }
      closeFormModal();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Error occurred during creation.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      path,
      id,
      data,
    }: {
      path: string;
      id: string;
      data: any;
    }) => {
      return api.patch(`${path}/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [variables.path.replace(/^\//, "")],
      });
      if (variables.path.includes("users")) {
        queryClient.invalidateQueries({ queryKey: ["users"] });
      }
      closeFormModal();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Error occurred during update.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ path, id }: { path: string; id: string }) => {
      return api.delete(`${path}/${id}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [variables.path.replace(/^\//, "")],
      });
      if (variables.path.includes("users")) {
        queryClient.invalidateQueries({ queryKey: ["users"] });
      }
      closeFormModal();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Error occurred during deletion.");
    },
  });

  const handleOpenCreate = (entity: string) => {
    setCurrentEntity(entity);
    setModalType("create");
    setEditItem(null);
    setFormData(getInitialFormState(entity));
    setModalOpen(true);
  };

  const handleOpenEdit = (entity: string, item: any) => {
    setCurrentEntity(entity);
    setModalType("edit");
    setEditItem(item);
    setFormData(mapItemToForm(entity, item));
    setModalOpen(true);
  };

  const handleOpenDelete = (entity: string, item: any) => {
    setCurrentEntity(entity);
    setModalType("delete");
    setEditItem(item);
    setModalOpen(true);
  };

  const closeFormModal = () => {
    setModalOpen(false);
    setEditItem(null);
    setFormData({});
  };

  const handleFormChange = (key: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const endpointMap: Record<string, string> = {
      faculty: "/faculties",
      department: "/departments",
      course: "/courses",
      lecturer: "/users",
      student: "/users",
      assignment: "/course-assignments",
    };

    const path = endpointMap[currentEntity!];

    if (modalType === "create") {
      const payload = { ...formData };
      if (currentEntity === "lecturer") payload.role = "LECTURER";
      if (currentEntity === "student") payload.role = "STUDENT";
      createMutation.mutate({ path, data: payload });
    } else if (modalType === "edit") {
      updateMutation.mutate({ path, id: editItem.id, data: formData });
    }
  };

  const handleDeleteConfirm = () => {
    const endpointMap: Record<string, string> = {
      faculty: "/faculties",
      department: "/departments",
      course: "/courses",
      lecturer: "/users",
      student: "/users",
      assignment: "/course-assignments",
    };
    const path = endpointMap[currentEntity!];
    deleteMutation.mutate({ path, id: editItem.id });
  };

  const handleExcelImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setImportLoading(true);
    setImportResult(null);

    const data = new FormData();
    data.append("file", selectedFile);

    try {
      const res = await api.post("/users/import-students", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setImportResult(res.data);
      queryClient.invalidateQueries({ queryKey: ["users", "STUDENT"] });
    } catch (err: any) {
      alert(
        err.response?.data?.message || "Failed to import student accounts.",
      );
    } finally {
      setImportLoading(false);
    }
  };

  const getInitialFormState = (entity: string) => {
    switch (entity) {
      case "faculty":
        return { name: "", code: "" };
      case "department":
        return { name: "", code: "", facultyId: "" };
      case "course":
        return { name: "", code: "", departmentId: "" };
      case "lecturer":
        return {
          email: "",
          password: "",
          firstName: "",
          lastName: "",
          departmentId: "",
        };
      case "student":
        return {
          email: "",
          password: "",
          registrationNumber: "",
          firstName: "",
          lastName: "",
          departmentId: "",
        };
      case "assignment":
        return {
          lecturerId: "",
          courseId: "",
          academicYear: "2025/2026",
          session: "Rain",
        };
      default:
        return {};
    }
  };

  const mapItemToForm = (entity: string, item: any) => {
    switch (entity) {
      case "faculty":
        return { name: item.name, code: item.code };
      case "department":
        return { name: item.name, code: item.code, facultyId: item.facultyId };
      case "course":
        return {
          name: item.name,
          code: item.code,
          departmentId: item.departmentId,
        };
      case "lecturer":
        return {
          email: item.email,
          firstName: item.firstName,
          lastName: item.lastName,
          departmentId: item.departmentId || "",
        };
      case "student":
        return {
          email: item.email,
          registrationNumber: item.registrationNumber,
          firstName: item.firstName,
          lastName: item.lastName,
          departmentId: item.departmentId || "",
        };
      default:
        return {};
    }
  };

  // Filters listings based on search box input
  const filterList = (list: any[], fields: string[]) => {
    if (!searchQuery) return list;
    return list.filter((item) =>
      fields.some((field) => {
        const val = item[field];
        return (
          val &&
          val.toString().toLowerCase().includes(searchQuery.toLowerCase())
        );
      }),
    );
  };

  // Course navigation helpers
  const getCourseLevel = (code: string): number | null => {
    const match = code?.match(/\s([1-5])\d{2}$/);
    return match ? Number(match[1]) * 100 : null;
  };

  const getCourseSemester = (code: string): "Harmattan" | "Rain" | null => {
    const match = code?.match(/(\d)$/);

    if (!match) return null;

    return Number(match[1]) % 2 === 0 ? "Rain" : "Harmattan";
  };
  const organizedCourses = useMemo(() => {
    const departments: Record<string, any> = {};

    courses.forEach((course: any) => {
      const departmentId = course.departmentId;
      const departmentName = course.department?.name || "Unknown Department";

      const level = getCourseLevel(course.code);
      const semester = getCourseSemester(course.code);

      if (!departmentId || !level || !semester) return;

      if (!departments[departmentId]) {
        departments[departmentId] = {
          id: departmentId,
          name: departmentName,
          levels: {},
        };
      }

      if (!departments[departmentId].levels[level]) {
        departments[departmentId].levels[level] = {
          level,
          semesters: {
            Harmattan: [],
            Rain: [],
          },
        };
      }

      departments[departmentId].levels[level].semesters[semester].push(course);
    });

    return Object.values(departments);
  }, [courses]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            Admin Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure academic hierarchies, lecturers assignments, and students
            records.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedFile(null);
              setImportResult(null);
              setImportModalOpen(true);
            }}
            className="glass-btn-secondary flex items-center space-x-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Import Student Accounts</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800/80 overflow-x-auto gap-2 pb-px">
        {[
          { key: "overview", label: "Overview", icon: Layers },
          { key: "faculties", label: "Faculties", icon: Building2 },
          { key: "departments", label: "Departments", icon: Building2 },
          { key: "courses", label: "Courses", icon: BookOpen },
          { key: "exams", label: "Examinations", icon: FileText },
          { key: "lecturers", label: "Lecturers", icon: Users },
          { key: "students", label: "Students", icon: Users },
          { key: "assignments", label: "Course Assignments", icon: UserPlus },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                setSearchQuery("");
              }}
              className={`
                flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-all shrink-0
                ${
                  activeTab === tab.key
                    ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800"
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SEARCH BOX FOR CRUD TABS */}
      {activeTab !== "overview" && (
        <div className="relative max-w-md">
          <Search
            className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500"
            size={16}
          />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input w-full pl-11"
          />
        </div>
      )}

      {/* TAB CONTENTS */}
      <div className="animate-in fade-in duration-200">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                label: "Faculties",
                count: faculties.length,
                icon: Building2,
                color: "text-sky-400",
              },
              {
                label: "Departments",
                count: departments.length,
                icon: Building2,
                color: "text-indigo-400",
              },
              {
                label: "Courses",
                count: courses.length,
                icon: BookOpen,
                color: "text-violet-400",
              },
              {
                label: "Lecturers",
                count: lecturers.length,
                icon: Users,
                color: "text-amber-400",
              },
              {
                label: "Students",
                count: students.length,
                icon: Users,
                color: "text-emerald-400",
              },
              {
                label: "Course Assignments",
                count: assignments.length,
                icon: UserPlus,
                color: "text-rose-400",
              },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="glass-panel p-6 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {card.label}
                    </p>
                    <p className="text-3xl font-black">{card.count}</p>
                  </div>
                  <div
                    className={`p-4 bg-slate-950/80 border border-slate-800 rounded-2xl ${card.color}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Faculties CRUD */}
        {activeTab === "faculties" && (
          <div className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-300">
                Faculties Directory
              </h2>
              <button
                onClick={() => handleOpenCreate("faculty")}
                className="glass-btn-primary py-2 px-3 text-xs flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Faculty</span>
              </button>
            </div>

            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-4">Faculty Name</th>
                  <th className="p-4">Faculty Code</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filterList(faculties, ["name", "code"]).map((fac: any) => (
                  <tr key={fac.id} className="hover:bg-slate-900/20">
                    <td className="p-4 font-semibold text-slate-200">
                      {fac.name}
                    </td>
                    <td className="p-4 font-mono text-xs">{fac.code}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit("faculty", fac)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete("faculty", fac)}
                        className="p-1.5 hover:bg-slate-800 text-red-500/80 hover:text-red-400 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Departments CRUD */}
        {activeTab === "departments" && (
          <div className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-300">
                Departments Directory
              </h2>
              <button
                onClick={() => handleOpenCreate("department")}
                className="glass-btn-primary py-2 px-3 text-xs flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Department</span>
              </button>
            </div>

            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Department Name</th>
                  <th className="p-4">Code</th>
                  <th className="p-4">Faculty</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filterList(departments, ["name", "code"]).map((dept: any) => (
                  <tr key={dept.id} className="hover:bg-slate-900/20">
                    <td className="p-4 font-semibold text-slate-200">
                      {dept.name}
                    </td>
                    <td className="p-4 font-mono text-xs">{dept.code}</td>
                    <td className="p-4 text-slate-400">{dept.faculty?.name}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit("department", dept)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete("department", dept)}
                        className="p-1.5 hover:bg-slate-800 text-red-500/80 hover:text-red-400 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Courses CRUD */}
        {/* {activeTab === "courses" && (
          <div className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-300">
                Courses Directory
              </h2>
              <button
                onClick={() => handleOpenCreate("course")}
                className="glass-btn-primary py-2 px-3 text-xs flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Course</span>
              </button>
            </div>

            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Course Name</th>
                  <th className="p-4">Course Code</th>
                  <th className="p-4">Department</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filterList(courses, ["name", "code"]).map((course: any) => (
                  <tr key={course.id} className="hover:bg-slate-900/20">
                    <td className="p-4 font-semibold text-slate-200">
                      {course.name}
                    </td>
                    <td className="p-4 font-mono text-xs text-indigo-400">
                      {course.code}
                    </td>
                    <td className="p-4 text-slate-400">
                      {course.department?.name}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit("course", course)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete("course", course)}
                        className="p-1.5 hover:bg-slate-800 text-red-500/80 hover:text-red-400 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )} */}
        {activeTab === "courses" && (
          <div className="glass-panel overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {courseView !== "departments" && (
                      <button
                        onClick={() => {
                          if (courseView === "courses") {
                            setCourseView("semesters");
                            setSelectedCourseSemester(null);
                          } else if (courseView === "semesters") {
                            setCourseView("levels");
                            setSelectedCourseLevel(null);
                          } else if (courseView === "levels") {
                            setCourseView("departments");
                            setSelectedCourseDepartment(null);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <ArrowLeftIcon size={16} />
                      </button>
                    )}

                    <h2 className="font-bold text-sm text-slate-200">
                      {courseView === "departments"
                        ? "Courses Directory"
                        : selectedCourseDepartment?.name}
                    </h2>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    {courseView === "departments" &&
                      "Select a department to browse its courses."}

                    {courseView === "levels" && "Select a level to continue."}

                    {courseView === "semesters" &&
                      "Select a semester to view its courses."}

                    {courseView === "courses" &&
                      `${selectedCourseSemester} semester courses`}
                  </p>
                </div>

                {/* Add course button */}
                <button
                  onClick={() => handleOpenCreate("course")}
                  className="glass-btn-primary py-2 px-3 text-xs flex items-center space-x-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Course</span>
                </button>
              </div>

              {/* Breadcrumb */}
              {courseView !== "departments" && (
                <div className="flex items-center gap-2 mt-4 text-[11px] text-slate-500">
                  <button
                    onClick={() => {
                      setCourseView("departments");
                      setSelectedCourseDepartment(null);
                      setSelectedCourseLevel(null);
                      setSelectedCourseSemester(null);
                    }}
                    className="hover:text-indigo-400 transition-colors"
                  >
                    Departments
                  </button>

                  {selectedCourseDepartment && (
                    <>
                      <span>/</span>

                      <button
                        onClick={() => {
                          setCourseView("levels");
                          setSelectedCourseLevel(null);
                          setSelectedCourseSemester(null);
                        }}
                        className="hover:text-indigo-400 transition-colors"
                      >
                        {selectedCourseDepartment.name}
                      </button>
                    </>
                  )}

                  {selectedCourseLevel && (
                    <>
                      <span>/</span>

                      <button
                        onClick={() => {
                          setCourseView("semesters");
                          setSelectedCourseSemester(null);
                        }}
                        className="hover:text-indigo-400 transition-colors"
                      >
                        {selectedCourseLevel} Level
                      </button>
                    </>
                  )}

                  {selectedCourseSemester && (
                    <>
                      <span>/</span>
                      <span className="text-slate-300">
                        {selectedCourseSemester}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* =========================================================
        DEPARTMENTS
       ========================================================= */}

            {courseView === "departments" && (
              <div className="p-5">
                {organizedCourses.length === 0 ? (
                  <div className="py-16 text-center">
                    <BookOpen className="h-10 w-10 mx-auto text-slate-700" />

                    <p className="text-sm text-slate-400 mt-3">
                      No courses available
                    </p>

                    <p className="text-xs text-slate-600 mt-1">
                      Add courses to populate the directory.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {organizedCourses.map((department: any) => {
                      const departmentCourseCount = Object.values(
                        department.levels,
                      ).reduce(
                        (total: number, level: any) =>
                          total +
                          level.semesters.Harmattan.length +
                          level.semesters.Rain.length,
                        0,
                      );

                      return (
                        <button
                          key={department.id}
                          onClick={() => {
                            setSelectedCourseDepartment(department);
                            setCourseView("levels");
                          }}
                          className="group text-left p-5 rounded-xl border border-slate-800 bg-slate-950/30 hover:bg-slate-900/60 hover:border-indigo-500/40 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                              <Building2 className="h-5 w-5 text-indigo-400" />
                            </div>

                            <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                          </div>

                          <h3 className="mt-4 font-bold text-sm text-slate-200">
                            {department.name}
                          </h3>

                          <p className="text-xs text-slate-500 mt-1">
                            {departmentCourseCount}{" "}
                            {departmentCourseCount === 1 ? "course" : "courses"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================
        LEVELS
       ========================================================= */}

            {courseView === "levels" && selectedCourseDepartment && (
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                  {[100, 200, 300, 400, 500].map((level) => {
                    const levelData = selectedCourseDepartment.levels[level];

                    const courseCount = levelData
                      ? levelData.semesters.Harmattan.length +
                        levelData.semesters.Rain.length
                      : 0;

                    return (
                      <button
                        key={level}
                        onClick={() => {
                          if (courseCount === 0) return;

                          setSelectedCourseLevel(level);
                          setCourseView("semesters");
                        }}
                        disabled={courseCount === 0}
                        className={`
                  group text-left p-5 rounded-xl border transition-all
                  ${
                    courseCount > 0
                      ? "border-slate-800 bg-slate-950/30 hover:bg-slate-900/60 hover:border-indigo-500/40"
                      : "border-slate-900 bg-slate-950/20 opacity-40 cursor-not-allowed"
                  }
                `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <span className="text-xs font-black text-indigo-400">
                              {level / 100}
                            </span>
                          </div>

                          {courseCount > 0 && (
                            <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                          )}
                        </div>

                        <h3 className="mt-4 font-bold text-sm text-slate-200">
                          {level} Level
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                          {courseCount}{" "}
                          {courseCount === 1 ? "course" : "courses"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =========================================================
        SEMESTERS
       ========================================================= */}

            {courseView === "semesters" &&
              selectedCourseDepartment &&
              selectedCourseLevel && (
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                    {(["Harmattan", "Rain"] as const).map((semester) => {
                      const semesterCourses =
                        selectedCourseDepartment.levels[selectedCourseLevel]
                          ?.semesters[semester] || [];

                      const isHarmattan = semester === "Harmattan";

                      return (
                        <button
                          key={semester}
                          onClick={() => {
                            if (semesterCourses.length === 0) return;

                            setSelectedCourseSemester(semester);
                            setCourseView("courses");
                          }}
                          disabled={semesterCourses.length === 0}
                          className={`
                    group text-left p-6 rounded-2xl border transition-all
                    ${
                      semesterCourses.length > 0
                        ? "border-slate-800 bg-slate-950/30 hover:bg-slate-900/60 hover:border-indigo-500/40"
                        : "border-slate-900 bg-slate-950/20 opacity-40 cursor-not-allowed"
                    }
                  `}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={`
                        h-11 w-11 rounded-xl flex items-center justify-center
                        ${
                          isHarmattan
                            ? "bg-orange-500/10 border border-orange-500/20"
                            : "bg-blue-500/10 border border-blue-500/20"
                        }
                      `}
                            >
                              <span
                                className={
                                  isHarmattan
                                    ? "text-orange-400 text-lg"
                                    : "text-blue-400 text-lg"
                                }
                              >
                                {isHarmattan ? "☀" : "☔"}
                              </span>
                            </div>

                            {semesterCourses.length > 0 && (
                              <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                            )}
                          </div>

                          <h3 className="mt-5 font-bold text-base text-slate-200">
                            {semester}
                          </h3>

                          <p className="text-xs text-slate-500 mt-1">
                            {semesterCourses.length}{" "}
                            {semesterCourses.length === 1
                              ? "course"
                              : "courses"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* =========================================================
        COURSES
       ========================================================= */}

            {courseView === "courses" &&
              selectedCourseDepartment &&
              selectedCourseLevel &&
              selectedCourseSemester && (
                <div>
                  {/* Course table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-4">Course Name</th>
                          <th className="p-4">Course Code</th>
                          <th className="p-4">Department</th>
                          <th className="p-4 text-center">Level</th>
                          <th className="p-4 text-center">Semester</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-800/60">
                        {filterList(
                          selectedCourseDepartment.levels[selectedCourseLevel]
                            .semesters[selectedCourseSemester],
                          ["name", "code"],
                        ).map((course: any) => (
                          <tr key={course.id} className="hover:bg-slate-900/20">
                            <td className="p-4 font-semibold text-slate-200">
                              {course.name}
                            </td>

                            <td className="p-4">
                              <span className="font-mono text-xs text-indigo-400">
                                {course.code}
                              </span>
                            </td>

                            <td className="p-4 text-slate-400">
                              {course.department?.name}
                            </td>

                            <td className="p-4 text-center">
                              <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 text-[11px] font-semibold">
                                {getCourseLevel(course.code)}
                              </span>
                            </td>

                            <td className="p-4 text-center">
                              <span
                                className={`
                          px-2 py-1 rounded-md text-[11px] font-semibold
                          ${
                            selectedCourseSemester === "Rain"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-orange-500/10 text-orange-400"
                          }
                        `}
                              >
                                {selectedCourseSemester}
                              </span>
                            </td>

                            <td className="p-4 text-right ">
                              <button
                                onClick={() => handleOpenEdit("course", course)}
                                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() =>
                                  handleOpenDelete("course", course)
                                }
                                className="p-1.5 hover:bg-slate-800 text-red-500/80 hover:text-red-400 rounded"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Empty state */}
                  {filterList(
                    selectedCourseDepartment.levels[selectedCourseLevel]
                      .semesters[selectedCourseSemester],
                    ["name", "code"],
                  ).length === 0 && (
                    <div className="py-16 text-center">
                      <BookOpen className="h-10 w-10 mx-auto text-slate-700" />

                      <p className="text-sm text-slate-400 mt-3">
                        No courses found
                      </p>

                      <p className="text-xs text-slate-600 mt-1">
                        Try a different search term.
                      </p>
                    </div>
                  )}
                </div>
              )}
          </div>
        )}

        {/* EXAMINATIONS DIRECTORY TAB */}
        {activeTab === "exams" && (
          <div className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-slate-300">
                  System Examinations Directory
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Select any examination to inspect topics, questions, setup, or
                  manage student attempts.
                </p>
              </div>
            </div>

            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Exam Title</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Academic Year</th>
                  <th className="p-4">Grading Mode</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filterList(exams, [
                  "title",
                  "academicYear",
                  "session",
                  "status",
                ]).map((exam: any) => (
                  <tr key={exam.id} className="hover:bg-slate-900/20">
                    <td className="p-4">
                      <div className="font-bold text-slate-200">
                        {exam.title}
                      </div>
                      <div className="text-slate-400 text-xs">
                        {exam.session ? `${exam.session} Session` : ""}
                      </div>
                    </td>
                    <td className="p-4">
                      {exam.status === "PUBLISHED" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          PUBLISHED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          DRAFT
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-xs text-indigo-400">
                      {exam.duration} mins
                    </td>
                    <td className="p-4 text-slate-400 text-xs">
                      {exam.academicYear || "N/A"}
                    </td>
                    <td className="p-4 text-slate-400 text-xs font-mono">
                      {exam.gradingMode}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to={`/admin/exams/${exam.id}`}
                        className="glass-btn-secondary px-3 py-1.5 text-xs inline-flex items-center space-x-1"
                      >
                        <span>Manage & Attempts</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Lecturers CRUD */}
        {activeTab === "lecturers" && (
          <div className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-300">
                Lecturers Directory
              </h2>
              <button
                onClick={() => handleOpenCreate("lecturer")}
                className="glass-btn-primary py-2 px-3 text-xs flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Lecturer</span>
              </button>
            </div>

            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Department</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filterList(lecturers, ["firstName", "lastName", "email"]).map(
                  (lec: any) => (
                    <tr key={lec.id} className="hover:bg-slate-900/20">
                      <td className="p-4 font-semibold text-slate-200">
                        {lec.firstName} {lec.lastName}
                      </td>
                      <td className="p-4 font-mono text-xs">{lec.email}</td>
                      <td className="p-4 text-slate-400">
                        {departments.find((d: any) => d.id === lec.departmentId)
                          ?.name || "N/A"}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit("lecturer", lec)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete("lecturer", lec)}
                          className="p-1.5 hover:bg-slate-800 text-red-500/80 hover:text-red-400 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Students CRUD */}
        {activeTab === "students" && (
          <div className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-300">
                Students Directory
              </h2>
              <button
                onClick={() => handleOpenCreate("student")}
                className="glass-btn-primary py-2 px-3 text-xs flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Student</span>
              </button>
            </div>

            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Registration Number</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Department</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filterList(students, [
                  "firstName",
                  "lastName",
                  "registrationNumber",
                  "email",
                ]).map((stud: any) => (
                  <tr key={stud.id} className="hover:bg-slate-900/20">
                    <td className="p-4 font-semibold text-slate-200">
                      {stud.firstName} {stud.lastName}
                    </td>
                    <td className="p-4 font-mono text-xs text-indigo-400">
                      {stud.registrationNumber}
                    </td>
                    <td className="p-4 font-mono text-xs">{stud.email}</td>
                    <td className="p-4 text-slate-400">
                      {departments.find((d: any) => d.id === stud.departmentId)
                        ?.name || "N/A"}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit("student", stud)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete("student", stud)}
                        className="p-1.5 hover:bg-slate-800 text-red-500/80 hover:text-red-400 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Assignments CRUD */}
        {activeTab === "assignments" && (
          <div className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-300">
                Lecturer Course Assignments
              </h2>
              <button
                onClick={() => handleOpenCreate("assignment")}
                className="glass-btn-primary py-2 px-3 text-xs flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Assign Course</span>
              </button>
            </div>

            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Lecturer</th>
                  <th className="p-4">Course</th>
                  <th className="p-4">Academic Year</th>
                  <th className="p-4">Session</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filterList(assignments, ["academicYear", "session"]).map(
                  (assign: any) => {
                    const lec = lecturers.find(
                      (l: any) => l.id === assign.lecturerId,
                    );
                    const course = courses.find(
                      (c: any) => c.id === assign.courseId,
                    );
                    return (
                      <tr key={assign.id} className="hover:bg-slate-900/20">
                        <td className="p-4 font-semibold text-slate-200">
                          {lec ? `${lec.firstName} ${lec.lastName}` : "Unknown"}
                        </td>
                        <td className="p-4 font-semibold text-indigo-400">
                          {course
                            ? `${course.code} - ${course.name}`
                            : "Unknown"}
                        </td>
                        <td className="p-4 text-slate-300">
                          {assign.academicYear}
                        </td>
                        <td className="p-4 font-mono text-xs">
                          {assign.session}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() =>
                              handleOpenDelete("assignment", assign)
                            }
                            className="p-1.5 hover:bg-slate-800 text-red-500/80 hover:text-red-400 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CRUD FORM DIALOG */}
      {modalOpen && (
        <div className="glass-modal-overlay">
          <div className="glass-modal-content">
            <h3 className="text-lg font-bold mb-4 capitalize">
              {modalType} {currentEntity}
            </h3>

            {modalType === "delete" ? (
              <div className="space-y-4">
                <p className="text-slate-300 text-sm">
                  Are you absolutely sure you want to delete this{" "}
                  {currentEntity}? This action is permanent and may break
                  associated records.
                </p>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={closeFormModal}
                    className="glass-btn-secondary py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="glass-btn-danger py-2 px-4"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {/* Faculty & Department Forms */}
                {(currentEntity === "faculty" ||
                  currentEntity === "department" ||
                  currentEntity === "course") && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">
                        Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name || ""}
                        onChange={(e) =>
                          handleFormChange("name", e.target.value)
                        }
                        className="glass-input w-full"
                        placeholder="e.g. Computer Science"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">
                        Code
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.code || ""}
                        onChange={(e) =>
                          handleFormChange("code", e.target.value)
                        }
                        className="glass-input w-full"
                        placeholder="e.g. CSC"
                      />
                    </div>
                  </>
                )}

                {/* Department Parent Faculty */}
                {currentEntity === "department" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">
                      Faculty Selection
                    </label>
                    <select
                      required
                      value={formData.facultyId || ""}
                      onChange={(e) =>
                        handleFormChange("facultyId", e.target.value)
                      }
                      className="glass-input w-full bg-slate-950"
                    >
                      <option value="">-- Choose Faculty --</option>
                      {faculties.map((fac: any) => (
                        <option key={fac.id} value={fac.id}>
                          {fac.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Course Parent Department */}
                {currentEntity === "course" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">
                      Department Selection
                    </label>
                    <select
                      required
                      value={formData.departmentId || ""}
                      onChange={(e) =>
                        handleFormChange("departmentId", e.target.value)
                      }
                      className="glass-input w-full bg-slate-950"
                    >
                      <option value="">-- Choose Department --</option>
                      {departments.map((dept: any) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* User Forms (Lecturer / Student) */}
                {(currentEntity === "lecturer" ||
                  currentEntity === "student") && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400">
                          First Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.firstName || ""}
                          onChange={(e) =>
                            handleFormChange("firstName", e.target.value)
                          }
                          className="glass-input w-full"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400">
                          Last Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.lastName || ""}
                          onChange={(e) =>
                            handleFormChange("lastName", e.target.value)
                          }
                          className="glass-input w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email || ""}
                        onChange={(e) =>
                          handleFormChange("email", e.target.value)
                        }
                        className="glass-input w-full"
                        placeholder="user@gap.edu"
                      />
                    </div>

                    {currentEntity === "student" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400">
                          Registration Number
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.registrationNumber || ""}
                          onChange={(e) =>
                            handleFormChange(
                              "registrationNumber",
                              e.target.value,
                            )
                          }
                          className="glass-input w-full"
                          placeholder="CPE/2021/001"
                        />
                      </div>
                    )}

                    {modalType === "create" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400">
                          Password
                        </label>
                        <input
                          type="password"
                          required
                          value={formData.password || ""}
                          onChange={(e) =>
                            handleFormChange("password", e.target.value)
                          }
                          className="glass-input w-full"
                          placeholder="Min 6 characters"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">
                        Department
                      </label>
                      <select
                        value={formData.departmentId || ""}
                        onChange={(e) =>
                          handleFormChange("departmentId", e.target.value)
                        }
                        className="glass-input w-full bg-slate-950"
                      >
                        <option value="">No Department Assigned</option>
                        {departments.map((d: any) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Course Assignment Form */}
                {currentEntity === "assignment" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">
                        Lecturer
                      </label>
                      <select
                        required
                        value={formData.lecturerId || ""}
                        onChange={(e) =>
                          handleFormChange("lecturerId", e.target.value)
                        }
                        className="glass-input w-full bg-slate-950"
                      >
                        <option value="">-- Choose Lecturer --</option>
                        {lecturers.map((l: any) => (
                          <option key={l.id} value={l.id}>
                            {l.firstName} {l.lastName} ({l.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">
                        Course
                      </label>
                      <select
                        required
                        value={formData.courseId || ""}
                        onChange={(e) =>
                          handleFormChange("courseId", e.target.value)
                        }
                        className="glass-input w-full bg-slate-950"
                      >
                        <option value="">-- Choose Course --</option>
                        {courses.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.code} - {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400">
                          Academic Year
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.academicYear || ""}
                          onChange={(e) =>
                            handleFormChange("academicYear", e.target.value)
                          }
                          className="glass-input w-full"
                          placeholder="e.g. 2025/2026"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400">
                          Session
                        </label>
                        <select
                          required
                          value={formData.session || ""}
                          onChange={(e) =>
                            handleFormChange("session", e.target.value)
                          }
                          className="glass-input w-full bg-slate-950"
                        >
                          <option value="Harmattan">Harmattan</option>
                          <option value="Rain">Rain</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="glass-btn-secondary py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="glass-btn-primary py-2 px-4">
                    Save Configuration
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EXCEL IMPORT MODAL */}
      {importModalOpen && (
        <div className="glass-modal-overlay">
          <div className="glass-modal-content max-w-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                Bulk Import Student Accounts
              </h3>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleExcelImport} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload an Excel spreadsheet (`.xlsx`) containing student
                details. The sheet columns must match:
                <br />
                <span className="font-mono bg-slate-950 px-1 py-0.5 border border-slate-800 rounded mt-1 inline-block">
                  email | registrationNumber | firstName | lastName |
                  departmentCode
                </span>
              </p>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center hover:border-slate-700 transition-colors relative">
                <input
                  type="file"
                  accept=".xlsx"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="h-10 w-10 text-indigo-500 mb-3 animate-pulse" />
                {selectedFile ? (
                  <p className="text-sm font-semibold text-indigo-400">
                    {selectedFile.name}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Drag & drop or click to select Excel sheet
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="glass-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importLoading || !selectedFile}
                  className="glass-btn-primary"
                >
                  {importLoading ? "Processing file..." : "Execute Import"}
                </button>
              </div>
            </form>

            {/* Results Display */}
            {importResult && (
              <div className="mt-6 border-t border-slate-800 pt-4 space-y-4">
                <h4 className="text-sm font-bold text-slate-300">
                  Import Summary
                </h4>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="text-slate-400">Accounts Created</p>
                      <p className="text-lg font-bold text-emerald-400">
                        {importResult.importedCount ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div>
                      <p className="text-slate-400">Failed / Duplicates</p>
                      <p className="text-lg font-bold text-red-400">
                        {importResult.errors?.length ??
                          importResult.errorCount ??
                          0}
                      </p>
                    </div>
                  </div>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="max-h-48 overflow-y-auto bg-slate-950/60 border border-slate-900 rounded-lg p-3 space-y-1.5 text-[11px] font-mono">
                    <p className="text-red-400 font-bold mb-1 border-b border-slate-800 pb-1">
                      Import Errors Details:
                    </p>
                    {importResult.errors.map((err: any, idx: number) => (
                      <p key={idx} className="text-red-400">
                        {typeof err === "string"
                          ? err
                          : `Row ${err.row || err.rowNumber || "?"}: ${err.message || err.error}`}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
