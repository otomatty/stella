public class S02DistinctTests
{
    [Theory(DisplayName = "S02 異なる値")]
    [InlineData("5\n1 1 3 0 3\n", "3\n")]
    [InlineData("3\n1 1 1\n", "1\n")]
    public void S02Distinct(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S02Distinct())));
    }
}
