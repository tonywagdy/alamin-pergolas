import React from 'react';

export interface Service {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
}

export interface Project {
  id: number | string;
  title: string;
  category: string;
  image: string;
  isFirestore?: boolean;
  createdAt?: any;
  order?: number;
}

export interface Lead {
  id?: string;
  name: string;
  phone: string;
  service: string;
  message: string;
  createdAt: any;
  status: 'new' | 'contacted' | 'closed';
}

export interface ActivityLogItem {
  id?: string;
  type: 'leads' | 'gallery' | 'before_after';
  description: string;
  createdAt: any;
}

export interface BeforeAfterItem {
  id: number;
  title: string;
  description: string;
  beforeImage: string;
  afterImage: string;
  location: string;
}

export interface WorkStep {
  step: number;
  title: string;
  description: string;
  iconName: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}
