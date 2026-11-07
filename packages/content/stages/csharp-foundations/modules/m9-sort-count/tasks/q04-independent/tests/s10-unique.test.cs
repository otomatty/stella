public class S10UniqueTests
{
    [Theory(DisplayName = "S10 異なる値の順")]
    [InlineData("5\n-2 8 -2 0 8\n", "-2\n0\n8\n")]
    [InlineData("3\n5 5 5\n", "5\n")]
    public void S10Unique(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S10Unique())));
    }
}
