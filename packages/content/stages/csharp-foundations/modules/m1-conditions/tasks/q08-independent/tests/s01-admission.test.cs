public class S01AdmissionTests
{
    [Theory(DisplayName = "S01 入館料")]
    [InlineData(11, 100)]
    [InlineData(12, 300)]
    [InlineData(65, 150)]
    [InlineData(0, 100)]
    [InlineData(64, 300)]
    [InlineData(120, 150)]
    public void S01Admission(int age, int expected)
    {
        Assert.Equal(expected, Answers.S01Admission(age));
    }
}
