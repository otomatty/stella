public class S01FloorTests
{
    [Theory(DisplayName = "S01 床で止める")]
    [InlineData("2 3\n-5\n4\n-1\n", "3\n")]
    [InlineData("0 1\n-1\n", "0\n")]
    [InlineData("5 0\n", "5\n")]
    public void S01Floor(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S01Floor())));
    }
}
