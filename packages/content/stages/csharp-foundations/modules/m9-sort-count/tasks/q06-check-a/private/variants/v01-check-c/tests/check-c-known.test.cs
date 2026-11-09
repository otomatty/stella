public class CheckCKnownTests
{
    [Theory(DisplayName = "確認C 名前の有無")]
    [InlineData("2 2\nred\nblue\nred\ngreen\n", "yes\nno\n")]
    [InlineData("0 1\na\n", "no\n")]
    [InlineData("1 2\nA\na\nA\n", "no\nyes\n")]
    public void CheckCKnown(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckCKnown())));
    }
}
