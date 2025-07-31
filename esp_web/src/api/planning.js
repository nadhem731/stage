import axios from './axios';

const API_URL = '/api/plannings';

export const getPlannings = () => axios.get(API_URL);
export const getPlanning = (id) => axios.get(`${API_URL}/${id}`);
export const createPlanning = (data) => axios.post(API_URL, data);
export const updatePlanning = (id, data) => axios.put(`${API_URL}/${id}`, data);
export const deletePlanning = (id) => axios.delete(`${API_URL}/${id}`); 