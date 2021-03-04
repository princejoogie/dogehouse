import React, { useEffect, useState } from "react";
import { Calendar } from "react-feather";
import { useQuery, useQueryClient } from "react-query";
import { useHistory } from "react-router-dom";
import { wsend, wsFetch } from "../../createWebsocket";
import { useCurrentRoomStore } from "../../webrtc/stores/useCurrentRoomStore";
import { useSocketStatus } from "../../webrtc/stores/useSocketStatus";
import { BodyWrapper } from "../components/BodyWrapper";
import { BottomVoiceControl } from "../components/BottomVoiceControl";
import { Button } from "../components/Button";
import { CircleButton } from "../components/CircleButton";
import { CreateRoomModal } from "../components/CreateRoomModal";
import { ProfileButton } from "../components/ProfileButton";
import { RoomCard } from "../components/RoomCard";
import { Spinner } from "../components/Spinner";
import { Wrapper } from "../components/Wrapper";
import { GET_SCHEDULED_ROOMS } from "../modules/scheduled-rooms/ScheduledRoomsPage";
import { Logo } from "../svgs/Logo";
import { PeopleIcon } from "../svgs/PeopleIcon";
import { CurrentRoom, PublicRoomsQuery } from "../types";

interface HomeProps {}

const get_top_public_rooms = "get_top_public_rooms";

const Page = ({
	currentRoom,
	cursor,
	isLastPage,
	isOnlyPage,
}: {
	currentRoom: CurrentRoom | null;
	cursor: number;
	isLastPage: boolean;
	isOnlyPage: boolean;
	onLoadMore: (o: number) => void;
}) => {
	const history = useHistory();
	const { status } = useSocketStatus();
	const { isLoading, data } = useQuery<PublicRoomsQuery>(
		[get_top_public_rooms, cursor],
		() =>
			wsFetch<any>({
				op: get_top_public_rooms,
				d: { cursor },
			}),
		{ staleTime: Infinity, enabled: status === "auth-good" }
	);

	if (isLoading) {
		return <Spinner />;
	}

	if (!data) {
		return null;
	}

	if (isOnlyPage && data.rooms.length === 0) {
		return null;
	}

	return (
		<>
			{data.rooms.map((r) =>
				r.id === currentRoom?.id ? null : (
					<div className={`mt-4`} key={r.id}>
						<RoomCard
							onClick={() => {
								wsend({ op: "join_room", d: { roomId: r.id } });
								history.push("/room/" + r.id);
							}}
							room={r}
							currentRoomId={currentRoom?.id}
						/>
					</div>
				)
			)}
			{isLastPage && data.nextCursor ? (
				<div className={`flex justify-center my-10`}>
					<Button
						variant="small"
						onClick={() =>
							wsend({
								op: "get_top_public_rooms",
								d: { cursor: data.nextCursor },
							})
						}
					>
						load more
					</Button>
				</div>
			) : null}
		</>
	);
};

export const Home: React.FC<HomeProps> = () => {
	const history = useHistory();
	const { currentRoom } = useCurrentRoomStore();
	const [cursors, setCursors] = useState([0]);
	const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
	const queryClient = useQueryClient();

	useEffect(() => {
		return () => {
			queryClient.invalidateQueries(get_top_public_rooms, {
				refetchActive: false,
			});
		};
	}, [queryClient]);

	return (
		<div className={`flex flex-col flex-1`}>
			<Wrapper>
				<BodyWrapper>
					<div className={`mb-10 mt-8`}>
						<Logo />
					</div>
					<div className={`mb-6 flex justify-center`}>
						<div className={`mr-4`}>
							<CircleButton
								onClick={() => {
									wsend({ op: "fetch_following_online", d: { cursor: 0 } });
									history.push("/following-online");
								}}
							>
								<PeopleIcon width={30} height={30} fill="#fff" />
							</CircleButton>
						</div>
						<div className={`ml-2`}>
							<CircleButton
								onClick={() => {
									queryClient.prefetchQuery(
										[GET_SCHEDULED_ROOMS, "", false],
										() =>
											wsFetch({
												op: GET_SCHEDULED_ROOMS,
												d: {
													cursor: "",
													getOnlyMyScheduledRooms: false,
												},
											}),
										{ staleTime: 0 }
									);
									history.push("/scheduled-rooms");
								}}
							>
								<Calendar width={30} height={30} color="#fff" />
							</CircleButton>
						</div>
						<div className={`ml-2`}>
							<ProfileButton circle size={60} />
						</div>
					</div>
					{currentRoom ? (
						<div className={`my-8`}>
							<RoomCard
								active
								onClick={() => history.push("/room/" + currentRoom.id)}
								room={currentRoom}
								currentRoomId={currentRoom.id}
							/>
						</div>
					) : null}
					{cursors.map((cursor, i) => (
						<Page
							key={cursor}
							currentRoom={currentRoom}
							cursor={cursor}
							isOnlyPage={cursors.length === 1}
							onLoadMore={(c) => setCursors([...cursors, c])}
							isLastPage={i === cursors.length - 1}
						/>
					))}
					<div style={{ height: 40 }} />
				</BodyWrapper>
			</Wrapper>
			<BottomVoiceControl>
				<div className={`mb-8 flex px-5`}>
					<Button
						variant="slim"
						dogeProbability={0.01}
						onClick={() => {
							setShowCreateRoomModal(true);
						}}
					>
						<h3 className={`text-2xl`}>Create Room</h3>
					</Button>
				</div>
			</BottomVoiceControl>
			{showCreateRoomModal ? (
				<CreateRoomModal onRequestClose={() => setShowCreateRoomModal(false)} />
			) : null}
		</div>
	);
};
