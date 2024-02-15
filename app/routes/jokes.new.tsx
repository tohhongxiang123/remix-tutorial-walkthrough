import {
    ActionFunctionArgs,
    LoaderFunction,
    LoaderFunctionArgs,
    json,
    redirect,
} from "@remix-run/node";
import {
    Form,
    Link,
    isRouteErrorResponse,
    useActionData,
    useRouteError,
} from "@remix-run/react";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";
import { getUserId, requireUserId } from "~/utils/session.server";

function validateJokeName(name: string) {
    if (name.length < 3) {
        return "Joke name must be at least 3 characters long";
    }
}

function validateJokeContent(content: string) {
    if (content.length < 10) {
        return "Joke content must be at least 10 characters long";
    }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const userId = await getUserId(request);
    if (!userId) {
        throw new Response("Unauthorized", { status: 401 });
    }

    return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const userId = await requireUserId(request, "/jokes/new");
    const form = await request.formData();
    const content = form.get("content");
    const name = form.get("name");

    if (typeof content !== "string" || typeof name !== "string") {
        return badRequest({
            fieldErrors: null,
            fields: null,
            formError: "Form not submitted correctly",
        });
    }

    const fieldErrors = {
        name: validateJokeName(name),
        content: validateJokeContent(content),
    };
    const fields = { content, name };

    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest({
            fieldErrors,
            fields,
            formError: null,
        });
    }

    const joke = await db.joke.create({
        data: { ...fields, jokesterId: userId },
    });
    return redirect(`/jokes/${joke.id}`);
};

export default function NewJokeRoute() {
    const actionData = useActionData<typeof action>();

    return (
        <div>
            <p>Add your own hilarious joke</p>
            <Form method="post">
                <div>
                    <label>
                        Name:{" "}
                        <input
                            defaultValue={actionData?.fields?.name}
                            type="text"
                            name="name"
                            aria-invalid={Boolean(
                                actionData?.fieldErrors?.name
                            )}
                            aria-errormessage={
                                actionData?.fieldErrors?.name
                                    ? "name-error"
                                    : undefined
                            }
                        />
                    </label>
                    {actionData?.fieldErrors?.name ? (
                        <p
                            className="form-validation-error"
                            id="name-error"
                            role="alert"
                        >
                            {actionData.fieldErrors.name}
                        </p>
                    ) : null}
                </div>
                <div>
                    <label>
                        Content:{" "}
                        <textarea
                            defaultValue={actionData?.fields?.content}
                            name="content"
                            aria-invalid={Boolean(
                                actionData?.fieldErrors?.content
                            )}
                            aria-errormessage={
                                actionData?.fieldErrors?.content
                                    ? "content-error"
                                    : undefined
                            }
                        />
                    </label>
                    {actionData?.fieldErrors?.content ? (
                        <p className="form-validation-error" role="alert">
                            {actionData.fieldErrors.content}
                        </p>
                    ) : null}
                </div>
                <div>
                    <button type="submit" className="button">
                        Add
                    </button>
                </div>
            </Form>
        </div>
    );
}

export function ErrorBoundary() {
    const error = useRouteError();

    if (isRouteErrorResponse(error) && error.status === 401) {
        return (
            <div className="error-container">
                <p>You must be logged in to create a joke.</p>
                <Link to="/login">Login</Link>
            </div>
        );
    }

    return (
        <div className="error-container">
            Something unexpected went wrong. Sorry about that.
        </div>
    );
}
