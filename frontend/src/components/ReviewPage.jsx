import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

const Star = ({ filled, onClick, size = 22 }) => (
  <button type="button" onClick={onClick} className="focus:outline-none">
    <svg width={size} height={size} viewBox="0 0 24 24" className={filled ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-gray-300'}>
      <path stroke="currentColor" strokeWidth="1.5" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  </button>
);

const RatingStars = ({ value = 0, onChange }) => (
  <div className="flex items-center gap-1">
    {[1,2,3,4,5].map(n => (
      <Star key={n} filled={n <= value} onClick={() => onChange(n)} />
    ))}
  </div>
);

const ReviewItem = ({ r }) => (
  <div className="border rounded-lg p-4 bg-white shadow-sm">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-800">{r.reviewerName || 'Reviewer'}</span>
      <div className="flex items-center">
        <RatingStars value={r.rating} onChange={() => {}} />
      </div>
    </div>
    {r.comment && <p className="mt-2 text-sm text-gray-600">{r.comment}</p>}
    <p className="mt-2 text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</p>
  </div>
);

const ReviewPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // form
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2200);
  };

  const avgStars = useMemo(() => Math.round(project?.avgRating || 0), [project]);

  const fetchAll = async () => {
    try {
      setLoading(true);

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) {
        console.error('Error fetching project:', projectError);
        setErr('Project not found');
        return;
      }

      // Fetch reviews - try with join first, fallback to separate queries
      let reviewsData = [];
      let reviewsError = null;

      // Try with join first
      const { data: joinedReviewsData, error: joinedReviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          project_id,
          user_id,
          rating,
          comment,
          created_at,
          users!inner(name, email)
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (joinedReviewsError) {
        console.log('Join query failed, trying separate queries:', joinedReviewsError);
        
        // Fallback: fetch reviews without join
        const { data: simpleReviewsData, error: simpleReviewsError } = await supabase
          .from('reviews')
          .select('*')
          .eq('project_id', id)
          .order('created_at', { ascending: false });

        if (simpleReviewsError) {
          console.error('Error fetching reviews:', simpleReviewsError);
          setErr('Failed to load reviews');
          return;
        }

        reviewsData = simpleReviewsData || [];
        
        // Fetch user data separately for each review
        const userIds = [...new Set(reviewsData.map(r => r.user_id))];
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', userIds);

        if (usersError) {
          console.error('Error fetching users:', usersError);
          // Continue without user data
        }

        // Create a map of user data
        const usersMap = {};
        if (usersData) {
          usersData.forEach(user => {
            usersMap[user.id] = user;
          });
        }

        // Format reviews with user data
        reviewsData = reviewsData.map(review => ({
          id: review.id,
          projectId: review.project_id,
          userId: review.user_id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.created_at,
          reviewerName: usersMap[review.user_id]?.name || "Anonymous",
          reviewerEmail: usersMap[review.user_id]?.email || ""
        }));
      } else {
        // Join query succeeded
        reviewsData = joinedReviewsData || [];
        
        // Format reviews for frontend
        reviewsData = reviewsData.map(review => ({
          id: review.id,
          projectId: review.project_id,
          userId: review.user_id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.created_at,
          reviewerName: review.users?.name || "Anonymous",
          reviewerEmail: review.users?.email || ""
        }));
      }

      setProject(projectData);
      setReviews(reviewsData);
      setErr('');

    } catch (e) {
      console.error('Error in fetchAll:', e);
      setErr('Failed to load project or reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [id]);

  const submitReview = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      showToast('error', 'Please select a rating (1-5)');
      return;
    }

    // Get current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.userId) {
      showToast('error', 'Please log in to submit a review');
      return;
    }

    setSubmitting(true);
    try {
      // Check if user already reviewed this project
      const { data: existingReview, error: existingError } = await supabase
        .from('reviews')
        .select('id')
        .eq('project_id', id)
        .eq('user_id', currentUser.userId)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error checking existing review:', existingError);
        showToast('error', 'Error checking existing review');
        return;
      }

      if (existingReview) {
        showToast('error', 'You have already reviewed this project');
        return;
      }

      // Insert review
      const { data: reviewData, error: insertError } = await supabase
        .from('reviews')
        .insert([{
          project_id: id,
          user_id: currentUser.userId,
          rating: rating,
          comment: comment || "",
          created_at: new Date().toISOString(),
        }])
        .select();

      if (insertError) {
        console.error('Error submitting review:', insertError);
        showToast('error', 'Failed to submit review');
        return;
      }

      // Update project's average rating and count
      const { data: allReviews, error: fetchReviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('project_id', id);

      if (fetchReviewsError) {
        console.error('Error fetching reviews for rating update:', fetchReviewsError);
        // Continue with success response even if rating update fails
      } else {
        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = totalRating / allReviews.length;
        const ratingsCount = allReviews.length;

        const { error: updateProjectError } = await supabase
          .from('projects')
          .update({ avgRating, ratingsCount })
          .eq('id', id);

        if (updateProjectError) {
          console.error('Error updating project rating:', updateProjectError);
        }
      }

      setRating(0);
      setComment('');
      showToast('success', 'Review submitted');
      await fetchAll();

    } catch (error) {
      console.error('Error submitting review:', error);
      showToast('error', 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto p-6">Loading...</div>;
  }
  if (err) {
    return <div className="max-w-5xl mx-auto p-6 text-red-600">{err}</div>;
  }
  if (!project) {
    return <div className="max-w-5xl mx-auto p-6">Project not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow border ${toast.type==='error'?'bg-red-50 border-red-200 text-red-700':'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.project_name || project.title || project.projectName}</h1>
              {project.domain && <p className="text-sm text-gray-600 mt-1">Domain: {project.domain}</p>}
              {project.deadline && <p className="text-sm text-gray-600">Deadline: {new Date(project.deadline).toLocaleDateString()}</p>}
              {(project.mentor?.name || project.mentor_email || project.mentorEmail) && (
                <p className="text-sm text-gray-700 mt-1">Mentor: <span className="font-medium">{project.mentor?.name || project.mentor_email || project.mentorEmail}</span></p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} filled={n <= avgStars} size={20} />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Avg Rating: {project.avgRating?.toFixed?.(2) || 0} ({project.ratingsCount || 0})</p>
            </div>
          </div>
          {(project.project_details || project.description) && <p className="mt-4 text-gray-800">{project.project_details || project.description}</p>}

          {Array.isArray(project.teamMembers) && project.teamMembers.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Team Members</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {project.teamMembers.map((tm, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    <span className="font-medium">{tm.name || 'Member'}</span>{tm.role ? ` - ${tm.role}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {reviews.length === 0 ? (
              <p className="text-gray-600">No reviews yet. Be the first to review.</p>
            ) : (
              reviews.map(r => <ReviewItem key={r.id} r={r} />)
            )}
          </div>

          <div className="bg-white rounded-2xl shadow p-5 h-fit">
            <h3 className="text-lg font-semibold mb-3">Leave a Review</h3>
            <form onSubmit={submitReview} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Your Rating *</label>
                <RatingStars value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Comment (optional)</label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Share your thoughts..."
                />
              </div>
              <button type="submit" disabled={submitting} className="w-full py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60">
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
