public class Q08FinalTests
{
    [Theory(DisplayName = "Q08 最後の値")]
    [InlineData("-2 2\n5\n-1\n", "2\n")]
    [InlineData("-2 0\n", "-2\n")]
    public void Q08Final(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q08Final())));
    }
}
