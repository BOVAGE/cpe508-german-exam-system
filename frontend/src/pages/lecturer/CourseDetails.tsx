import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../utils/api";
import { ArrowLeft, Plus, Clock, Award, HelpCircle } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const CourseDetails: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    academicYear: "2025/2026",
    session: "Rain",
    examKind: "MID_SEMESTER",
    scheduledStart: "",
    scheduledEnd: "",
    duration: 60,
    gradingMode: "NON_STRICT",
  });

  // Fetch course info
  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ["courses", courseId],
    queryFn: async () => {
      const res = await api.get(`/courses/${courseId}`);
      return res.data;
    },
  });

  // Fetch all exams
  const { data: exams = [], isLoading: loadingExams } = useQuery({
    queryKey: ["exams"],
    queryFn: async () => {
      const res = await api.get("/exams");
      return res.data;
    },
  });

  // Filter exams for this course
  const courseExams = exams.filter((e: any) => e.courseId === courseId);

  // Mutation for creating a new exam
  const createExamMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post("/exams", { ...data, courseId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      setModalOpen(false);
      // Reset form
      setFormData({
        title: "",
        description: "",
        academicYear: "2025/2026",
        session: "Rain",
        examKind: "MID_SEMESTER",
        scheduledStart: "",
        scheduledEnd: "",
        duration: 60,
        gradingMode: "NON_STRICT",
      });
    },
    onError: (err: any) => {
      alert(
        err.response?.data?.message ||
          "Failed to create examination. Verify that you are assigned to teach this course.",
      );
    },
  });

  const handleFormChange = (key: string, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createExamMutation.mutate(formData);
  };

  if (loadingCourse) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs">Loading course details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/lecturer/dashboard"
        className="flex items-center space-x-2 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Courses</span>
      </Link>

      {/* Course Title Board */}
      {course && (
        <div className="glass-panel p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"></div>
          <div className="space-y-2 relative z-10">
            <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
              {course.code}
            </span>
            <h1 className="text-2xl md:text-3xl font-black">{course.name}</h1>
            <p className="text-slate-400 text-sm">
              {course.department?.name} • {course.department?.faculty?.name}
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="glass-btn-primary flex items-center space-x-2 shrink-0 relative z-10"
          >
            <Plus className="h-4 w-4" />
            <span>Create Examination</span>
          </button>
        </div>
      )}

      {/* Exams List */}
      <div>
        <h2 className="text-lg font-bold mb-4">Course Examinations</h2>

        {loadingExams ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
        ) : courseExams.length === 0 ? (
          <div className="glass-panel p-12 text-center flex flex-col items-center justify-center space-y-4">
            <HelpCircle className="h-12 w-12 text-slate-600" />
            <div>
              <h3 className="text-md font-bold text-slate-300">
                No Examinations Found
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                Get started by clicking the "Create Examination" button above.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courseExams.map((exam: any) => (
              <Link
                key={exam.id}
                to={`/lecturer/exams/${exam.id}`}
                className="glass-card p-6 flex flex-col justify-between min-h-[180px] text-left relative"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider bg-slate-800/80 px-2.5 py-1 rounded text-slate-300">
                      {exam.examKind.replace("_", " ")}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-1 rounded border ${
                        exam.status === "PUBLISHED"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      }`}
                    >
                      {exam.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-200 text-lg group-hover:text-white transition-colors leading-snug">
                    {exam.title}
                  </h3>

                  {exam.description && (
                    <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                      {exam.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-4 mt-4 text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{exam.duration} Min</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Award className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="capitalize">
                      {exam.gradingMode.toLowerCase()}
                    </span>
                  </div>
                  <div className="text-right truncate font-medium text-slate-300">
                    {exam.academicYear} ({exam.session})
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* CREATE EXAM MODAL */}
      {modalOpen && (
        <div className="glass-modal-overlay">
          <div className="glass-modal-content max-w-lg">
            <h3 className="text-lg font-bold mb-4">Create New Examination</h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Examination Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleFormChange("title", e.target.value)}
                  className="glass-input w-full"
                  placeholder="e.g. Mid-Semester Test"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleFormChange("description", e.target.value)
                  }
                  className="glass-input w-full min-h-[80px]"
                  placeholder="Add exam instructions..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.academicYear}
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
                    value={formData.session}
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

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    Exam Kind
                  </label>
                  <select
                    value={formData.examKind}
                    onChange={(e) =>
                      handleFormChange("examKind", e.target.value)
                    }
                    className="glass-input w-full bg-slate-950"
                  >
                    <option value="MID_SEMESTER">Mid Semester</option>
                    <option value="END_OF_SEMESTER">End Semester</option>
                    <option value="QUIZ">Quiz</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.duration}
                    onChange={(e) =>
                      handleFormChange("duration", parseInt(e.target.value))
                    }
                    className="glass-input w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    Grading Mode
                  </label>
                  <select
                    value={formData.gradingMode}
                    onChange={(e) =>
                      handleFormChange("gradingMode", e.target.value)
                    }
                    className="glass-input w-full bg-slate-950"
                  >
                    <option value="NON_STRICT">Non-Strict</option>
                    <option value="STRICT">Strict</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    Scheduled Start
                  </label>

                  <DatePicker
                    selected={
                      formData.scheduledStart
                        ? new Date(formData.scheduledStart)
                        : null
                    }
                    onChange={(date) => {
                      handleFormChange(
                        "scheduledStart",
                        date ? date.toISOString() : "",
                      );
                    }}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="MMM d, yyyy h:mm aa"
                    placeholderText="Select start date & time"
                    className="glass-input w-full text-slate-300"
                    wrapperClassName="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    Scheduled End
                  </label>

                  <DatePicker
                    selected={
                      formData.scheduledEnd
                        ? new Date(formData.scheduledEnd)
                        : null
                    }
                    onChange={(date) => {
                      handleFormChange(
                        "scheduledEnd",
                        date ? date.toISOString() : "",
                      );
                    }}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="MMM d, yyyy h:mm aa"
                    placeholderText="Select end date & time"
                    className="glass-input w-full text-slate-300"
                    wrapperClassName="w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="glass-btn-secondary py-2 px-4"
                >
                  Cancel
                </button>
                <button type="submit" className="glass-btn-primary py-2 px-4">
                  Create Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetails;
