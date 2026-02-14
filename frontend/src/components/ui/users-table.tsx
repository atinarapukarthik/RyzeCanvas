"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import { User, Mail, Calendar, Crown } from "lucide-react";

export interface UserData {
	id: string;
	name: string;
	email: string;
	role: "admin" | "user";
	projectsCount: number;
	lastActive: string;
	joinedDate: string;
	status: "active" | "inactive";
	activityData: number[];
}

interface UsersTableProps {
	title?: string;
	users?: UserData[];
	onUserSelect?: (userId: string) => void;
	className?: string;
}

const defaultUsers: UserData[] = [
	{
		id: "1",
		name: "John Doe",
		email: "john@example.com",
		role: "admin",
		projectsCount: 24,
		lastActive: "2 hours ago",
		joinedDate: "2024-01-15",
		status: "active",
		activityData: [5, 8, 6, 9, 12, 10, 14, 11, 13, 15],
	},
	{
		id: "2",
		name: "Jane Smith",
		email: "jane@example.com",
		role: "user",
		projectsCount: 12,
		lastActive: "5 minutes ago",
		joinedDate: "2024-02-20",
		status: "active",
		activityData: [3, 5, 7, 6, 8, 9, 7, 10, 11, 12],
	},
	{
		id: "3",
		name: "Bob Johnson",
		email: "bob@example.com",
		role: "user",
		projectsCount: 8,
		lastActive: "1 day ago",
		joinedDate: "2024-03-10",
		status: "active",
		activityData: [2, 3, 4, 5, 4, 6, 5, 7, 6, 8],
	},
	{
		id: "4",
		name: "Alice Brown",
		email: "alice@example.com",
		role: "user",
		projectsCount: 19,
		lastActive: "3 hours ago",
		joinedDate: "2024-01-28",
		status: "active",
		activityData: [7, 9, 8, 10, 11, 12, 13, 12, 14, 16],
	},
	{
		id: "5",
		name: "Charlie Wilson",
		email: "charlie@example.com",
		role: "user",
		projectsCount: 5,
		lastActive: "2 weeks ago",
		joinedDate: "2024-04-05",
		status: "inactive",
		activityData: [1, 2, 1, 3, 2, 3, 2, 3, 1, 2],
	},
];

export function UsersTable({
	title = "Users",
	users: initialUsers = defaultUsers,
	onUserSelect,
	className = "",
}: UsersTableProps = {}) {
	const users = initialUsers;
	const [selectedUser, setSelectedUser] = useState<string | null>("1");
	const [mounted, setMounted] = useState(false);
	const shouldReduceMotion = useReducedMotion();
	const { theme } = useTheme();

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMounted(true);
	}, []);

	const isDark = theme === "dark";

	const handleUserSelect = (userId: string) => {
		setSelectedUser(userId);
		if (onUserSelect) {
			onUserSelect(userId);
		}
	};

	const getRoleBadge = (role: string) => {
		const isDark = mounted ? theme === "dark" : true;
		if (role === "admin") {
			return {
				icon: <Crown className="h-3 w-3" />,
				bgColor: isDark ? "bg-yellow-500/10" : "bg-yellow-50",
				borderColor: isDark ? "border-yellow-500/30" : "border-yellow-200",
				textColor: isDark ? "text-yellow-400" : "text-yellow-600",
			};
		}
		return {
			icon: <User className="h-3 w-3" />,
			bgColor: isDark ? "bg-blue-500/10" : "bg-blue-50",
			borderColor: isDark ? "border-blue-500/30" : "border-blue-200",
			textColor: isDark ? "text-blue-400" : "text-blue-600",
		};
	};

	const getStatusColor = (status: string) => {
		if (!mounted) {
			const isActive = status === "active";
			return {
				bgColor: isActive ? "bg-green-500/10" : "bg-gray-500/10",
				borderColor: isActive ? "border-green-500/30" : "border-gray-500/30",
				textColor: isActive ? "text-green-400" : "text-gray-400",
			};
		}

		const isActive = status === "active";
		const bgColor = isActive
			? isDark
				? "bg-green-500/10"
				: "bg-green-50"
			: isDark
				? "bg-gray-500/10"
				: "bg-gray-50";
		const borderColor = isActive
			? isDark
				? "border-green-500/30"
				: "border-green-200"
			: isDark
				? "border-gray-500/30"
				: "border-gray-200";
		const textColor = isActive
			? isDark
				? "text-green-400"
				: "text-green-600"
			: isDark
				? "text-gray-400"
				: "text-gray-600";

		return { bgColor, borderColor, textColor };
	};

	const renderSparkline = (data: number[]) => {
		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;

		const createPath = (dataPoints: number[]) => {
			return dataPoints
				.map((value, index) => {
					const x = (index / (dataPoints.length - 1)) * 60;
					const y = 20 - ((value - min) / range) * 15;
					return `${x},${y}`;
				})
				.join(" ");
		};

		const fullPath = createPath(data);

		return (
			<div className="w-16 h-6">
				<motion.svg
					width="60"
					height="20"
					viewBox="0 0 60 20"
					className="overflow-visible"
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{
						type: "spring",
						stiffness: 400,
						damping: 25,
						duration: shouldReduceMotion ? 0.2 : 0.5,
					}}
				>
					{fullPath && (
						<motion.polyline
							points={fullPath}
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							className="text-primary"
							initial={{ pathLength: 0 }}
							animate={{ pathLength: 1 }}
							transition={{
								duration: shouldReduceMotion ? 0.3 : 0.8,
								ease: "easeOut",
								delay: 0.2,
							}}
						/>
					)}
				</motion.svg>
			</div>
		);
	};

	const containerVariants = {
		visible: {
			transition: {
				staggerChildren: 0.04,
				delayChildren: 0.1,
			},
		},
	};

	const rowVariants = {
		hidden: {
			opacity: 0,
			y: 20,
			scale: 0.98,
			filter: "blur(4px)",
		},
		visible: {
			opacity: 1,
			y: 0,
			scale: 1,
			filter: "blur(0px)",
			transition: {
				type: "spring" as const,
				stiffness: 400,
				damping: 25,
				mass: 0.7,
			},
		},
	};

	return (
		<div className={`w-full max-w-7xl mx-auto ${className}`}>
			<div className="bg-background border border-border/50 rounded-2xl overflow-hidden">
				<div className="overflow-x-auto">
					<div className="min-w-[1000px]">
						{/* Table Headers */}
						<div
							className="px-8 py-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wide bg-muted/15 border-b border-border/20 text-left"
							style={{
								display: "grid",
								gridTemplateColumns:
									"300px 120px 120px 100px 100px 120px 100px",
								columnGap: "6px",
							}}
						>
							<div style={{ textAlign: "left" }}>{title}</div>
							<div style={{ textAlign: "left" }}>Role</div>
							<div style={{ textAlign: "left" }}>Status</div>
							<div style={{ textAlign: "left" }}>Projects</div>
							<div style={{ textAlign: "left" }}>Last Active</div>
							<div style={{ textAlign: "left" }}>Activity</div>
							<div style={{ textAlign: "left" }}>Joined</div>
						</div>

						{/* Table Rows */}
						<motion.div
							variants={containerVariants}
							initial="hidden"
							animate="visible"
						>
							{users.map((user, userIndex) => (
								<motion.div key={user.id} variants={rowVariants}>
									<div
										className={`px-8 py-3 cursor-pointer group relative transition-all duration-200 ${selectedUser === user.id
											? "bg-muted/50 border-b border-border/30"
											: "hover:bg-muted/30"
											} ${userIndex < users.length - 1 && selectedUser !== user.id
												? "border-b border-border/20"
												: ""
											}`}
										style={{
											display: "grid",
											gridTemplateColumns:
												"300px 120px 120px 100px 100px 120px 100px",
											columnGap: "6px",
										}}
										onClick={() => handleUserSelect(user.id)}
									>
										{/* User Info */}
										<div className="flex items-center gap-4">
											<div className="w-10 h-10 rounded-full overflow-hidden border border-border/30 flex items-center justify-center bg-primary/10">
												<User className="h-5 w-5 text-primary" />
											</div>
											<div className="min-w-0">
												<div className="font-medium text-foreground/90 truncate">
													{user.name}
												</div>
												<div className="text-xs text-muted-foreground/70 flex items-center gap-1">
													<Mail className="h-3 w-3" />
													{user.email}
												</div>
											</div>
										</div>

										{/* Role */}
										<div className="flex items-center">
											{(() => {
												const { icon, bgColor, borderColor, textColor } =
													getRoleBadge(user.role);
												return (
													<div
														className={`px-2 py-1 rounded-lg text-xs font-medium border ${bgColor} ${borderColor} ${textColor} flex items-center gap-1`}
													>
														{icon}
														{user.role}
													</div>
												);
											})()}
										</div>

										{/* Status */}
										<div className="flex items-center">
											{(() => {
												const { bgColor, borderColor, textColor } =
													getStatusColor(user.status);
												return (
													<div
														className={`px-2 py-1 rounded-lg text-xs font-medium border ${bgColor} ${borderColor} ${textColor}`}
													>
														{user.status}
													</div>
												);
											})()}
										</div>

										{/* Projects Count */}
										<div className="flex items-center">
											<span className="font-semibold text-foreground/90">
												{user.projectsCount}
											</span>
										</div>

										{/* Last Active */}
										<div className="flex items-center">
											<span className="text-sm text-muted-foreground truncate">
												{user.lastActive}
											</span>
										</div>

										{/* Activity Chart */}
										<div className="flex items-center">
											<div className="px-6">
												{renderSparkline(user.activityData)}
											</div>
										</div>

										{/* Joined Date */}
										<div className="flex items-center gap-1">
											<Calendar className="h-3 w-3 text-muted-foreground" />
											<span className="text-xs text-muted-foreground">
												{new Date(user.joinedDate).toLocaleDateString("en-US", {
													month: "short",
													year: "numeric",
												})}
											</span>
										</div>
									</div>
								</motion.div>
							))}
						</motion.div>
					</div>
				</div>
			</div>
		</div>
	);
}
