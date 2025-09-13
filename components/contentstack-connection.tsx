"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, Settings } from "lucide-react"
import { type ContentstackConfig, createContentstackClient } from "@/lib/contentstack-api"

interface ContentstackConnectionProps {
  onConnectionSuccess: (client: any, config: ContentstackConfig) => void
  isConnected: boolean
}


export function ContentstackConnection() {
  return null;
}
