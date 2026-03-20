import type { ComponentType, ReactNode } from "react";
import type { AgentStatus, PrInfo } from "../../shared/types";

// Base props for visual rendering
export interface BaseWorkspaceHeaderProps {
	name: string;
	isActive: boolean;
	isCollapsed: boolean;
	paneCount: number;
	isEditing: boolean;
	inputProps: React.InputHTMLAttributes<HTMLInputElement>;
	onClick: (e: React.MouseEvent) => void;
	onContextMenu: (e: React.MouseEvent) => void;
}

export interface BasePaneEntryProps {
	label: string;
	cwd: string;
	branch: string | null;
	pr: PrInfo | null;
	agentStatus: AgentStatus;
	isFocused: boolean;
	onClick: () => void;
	onContextMenu: (e: React.MouseEvent) => void;
	paneId: string;
}

export interface CollapsedVariantProps {
	name: string;
	isActive: boolean;
	onClick: () => void;
}

export interface WrapperTokens {
	base: string;
	active: string;
	inactive: string;
}

export interface ThemeVariantConfig {
	wrapper: WrapperTokens;
	Header: ComponentType<BaseWorkspaceHeaderProps>;
	Entry: ComponentType<BasePaneEntryProps>;
	Collapsed: ComponentType<CollapsedVariantProps>;
}

export interface WrapperProps {
	isActive: boolean;
	children: ReactNode;
}
